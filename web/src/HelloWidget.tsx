import "./styles.css";
import { useEffect, useState, useRef } from "react";
import {
  KanbanComponent,
  ColumnsDirective,
  ColumnDirective
} from "@syncfusion/ej2-react-kanban";
import { buildKanbanData } from "./servicenow/buildKanbanData";
import { getAgileSnapshot, updateTaskState, getRuntimeEnvironment } from './servicenow/mcpClient';
import { installLocalMcpShimIfEnabled } from './servicenow/mcpLocalShim';
import type { AgileSnapshot } from '../../lib/servicenow/types';

const sprintData = [
  {
    Id: 1,
    Title: "Sprint planning",
    Status: "Backlog",
    Summary: "Define sprint goal and prioritize top items.",
    Assignee: "Nova",
    Tags: "Planning",
    RankId: 1
  },
  {
    Id: 2,
    Title: "Story grooming",
    Status: "Backlog",
    Summary: "Refine acceptance criteria for core stories.",
    Assignee: "Lyra",
    Tags: "Refinement",
    RankId: 2
  },
  {
    Id: 3,
    Title: "Auth API",
    Status: "In Progress",
    Summary: "Implement OAuth handshake and token refresh.",
    Assignee: "Orion",
    Tags: "Backend",
    RankId: 1
  },
  {
    Id: 4,
    Title: "Kanban UI polish",
    Status: "In Progress",
    Summary: "Add swimlanes, WIP limits, and styling.",
    Assignee: "Echo",
    Tags: "Frontend",
    RankId: 2
  },
  {
    Id: 5,
    Title: "QA checklist",
    Status: "Review",
    Summary: "Create regression checklist for release.",
    Assignee: "Lyra",
    Tags: "QA",
    RankId: 1
  },
  {
    Id: 6,
    Title: "Release notes",
    Status: "Done",
    Summary: "Draft and circulate sprint release notes.",
    Assignee: "Nova",
    Tags: "Docs",
    RankId: 1
  }
];

export default function HelloWidget() {
  // Install local MCP shim if enabled (dev/testing only)
  // This must run before any state initialization or effects
  installLocalMcpShimIfEnabled();

  const [activeTab, setActiveTab] = useState<string>('Sprint Tracking');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('due-date');
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState<boolean>(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Permanent overlay killer - removes debug lines and prevents re-creation
    const isDebugOverlayNode = (node: Element): boolean => {
      if (!(node instanceof HTMLElement)) return false;
      
      // Check ID and class for debug/overlay keywords
      const id = node.id || '';
      const className = node.className || '';
      if (id.includes('debug') || id.includes('overlay') || 
          className.includes('debug') || className.includes('overlay')) {
        return true;
      }
      
      // Check data attributes
      if (node.hasAttribute('data-debug') || node.hasAttribute('data-overlay')) {
        return true;
      }
      
      // Check if it's a thin vertical line (likely debug overlay)
      const styles = window.getComputedStyle(node);
      const position = styles.position;
      const width = parseFloat(styles.width);
      const height = parseFloat(styles.height);
      const bg = styles.backgroundColor;
      const borderLeft = styles.borderLeftColor;
      const borderRight = styles.borderRightColor;
      
      // Detect thin vertical lines
      if ((position === 'fixed' || position === 'absolute') && 
          width <= 3 && height >= 100) {
        // Check for yellow/lime colors
        const isYellowish = (color: string) => {
          return color.includes('255, 255, 0') || // rgb(255,255,0)
                 color.includes('255,255,0') ||
                 color === 'yellow' ||
                 color === 'lime' ||
                 color.includes('0, 255, 0'); // lime rgb
        };
        
        if (isYellowish(bg) || isYellowish(borderLeft) || isYellowish(borderRight)) {
          // Make sure it's not inside the Kanban board itself (only remove overlays)
          const isInsideBoard = node.closest('#sprint-board');
          return !isInsideBoard;
        }
      }
      
      return false;
    };
    
    const removeOverlays = (): number => {
      let removedCount = 0;
      
      // Remove by specific ID
      const debugOverlay = document.getElementById('debug-overlay');
      if (debugOverlay) {
        debugOverlay.remove();
        removedCount++;
      }
      
      // Scan all elements for debug overlays
      document.querySelectorAll('div').forEach(div => {
        if (isDebugOverlayNode(div)) {
          div.remove();
          removedCount++;
        }
      });
      
      return removedCount;
    };
    
    // Initial cleanup
    const initialRemoved = removeOverlays();
    console.log(`Overlay cleanup complete: removed ${initialRemoved} nodes`);
    
    // MutationObserver to prevent re-creation
    const overlayKiller = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof Element && isDebugOverlayNode(node)) {
            console.log('Prevented debug overlay re-creation');
            node.remove();
          }
        });
      });
    });
    
    overlayKiller.observe(document.body, {
      childList: true,
      subtree: true
    });

    const DEBUG_ALIGN = false;
    const NORMALIZE_SWIMLANES = false;
    const AUTO_CORRECT_DRIFT = false;

    let measureCount = 0;

    const autoCorrectSwimlaneDrift = () => {
      if (!AUTO_CORRECT_DRIFT) return;

      const firstContentTd = document.querySelector('#sprint-board .e-content-table tr.e-content-row:not(.e-swimlane-row) td.e-content-cells[data-key]') as HTMLElement;
      if (!firstContentTd) return;

      const refLeft = firstContentTd.getBoundingClientRect().left;
      const swimlaneTds = document.querySelectorAll('#sprint-board .e-content-table tr.e-content-row.e-swimlane-row td[colspan]');

      console.log(`\n🔧 Auto-correcting swimlane drift (ref: ${refLeft.toFixed(2)}px):`);

      swimlaneTds.forEach((td) => {
        const swimlaneTd = td as HTMLElement;
        const row = swimlaneTd.closest('tr');
        const swimlaneText = row?.querySelector('.e-swimlane-text')?.textContent?.trim() || 'Unknown';
        
        const tdLeft = swimlaneTd.getBoundingClientRect().left;
        const delta = tdLeft - refLeft;

        if (Math.abs(delta) > 2) {
          // Apply transform correction
          swimlaneTd.style.transform = `translateX(${-delta}px)`;
          swimlaneTd.style.willChange = 'transform';
          swimlaneTd.style.position = 'relative';
          console.log(`  ${swimlaneText}: delta=${delta.toFixed(2)}px → corrected with translateX(${(-delta).toFixed(2)}px)`);
        } else {
          // Clear any previous correction if now aligned
          if (swimlaneTd.style.transform) {
            swimlaneTd.style.transform = '';
            swimlaneTd.style.willChange = '';
            swimlaneTd.style.position = '';
          }
          console.log(`  ${swimlaneText}: delta=${delta.toFixed(2)}px → aligned (no correction needed)`);
        }
      });
    };

    const normalizeSwimlaneRows = () => {
      console.groupCollapsed('[normalizeSwimlaneRows] DIAGNOSTIC + FIX', new Date().toISOString());

      const contentTable = document.querySelector('#sprint-board .e-content-table') as HTMLElement;
      if (!contentTable) {
        console.log("⚠️  Content table not found");
        console.groupEnd();
        return false;
      }

      const colCount = contentTable.querySelectorAll('colgroup col').length;
      console.log(`Column count: ${colCount}`);

      const swimlaneRows = document.querySelectorAll('#sprint-board .e-content-table tr.e-content-row.e-swimlane-row');
      console.log(`Swimlane rows found: ${swimlaneRows.length}\n`);

      let fixedCount = 0;

      swimlaneRows.forEach((row, index) => {
        const key = (row as HTMLElement).getAttribute('data-key') 
          || (row as HTMLElement).getAttribute('aria-label') 
          || `Row ${index + 1}`;
        
        const tds = Array.from(row.children).filter(el => el.tagName === 'TD') as HTMLTableCellElement[];
        
        console.log(`\n${"=".repeat(50)}`);
        console.log(`${key}:`);
        console.log(`  TD count: ${tds.length}`);
        
        // Row position diagnostics
        const rowRect = (row as HTMLElement).getBoundingClientRect();
        const rowStyles = window.getComputedStyle(row as HTMLElement);
        console.log(`\n  📍 TR Position:`);
        console.log(`    rect.left: ${rowRect.left.toFixed(2)}px`);
        console.log(`    display: ${rowStyles.display}`);
        console.log(`    position: ${rowStyles.position}`);
        console.log(`    left: ${rowStyles.left}`);
        console.log(`    marginLeft: ${rowStyles.marginLeft}`);
        console.log(`    paddingLeft: ${rowStyles.paddingLeft}`);
        console.log(`    transform: ${rowStyles.transform}`);
        console.log(`    translate: ${(rowStyles as any).translate || 'n/a'}`);
        
        // Find the real colspan TD containing the swimlane header
        const colspanTd = tds.find(td => td.querySelector('.e-swimlane-header')) || null;
        
        console.log(`\n  📦 TDs:`);
        tds.forEach((td, idx) => {
          const colspan = td.getAttribute('colspan');
          const display = window.getComputedStyle(td).display;
          const tdRect = td.getBoundingClientRect();
          const tdStyles = window.getComputedStyle(td);
          const isColspanTd = td === colspanTd ? ' ← COLSPAN TD' : '';
          console.log(`    TD[${idx}]: colspan=${colspan || 'none'}, display=${display}, left=${tdRect.left.toFixed(2)}px${isColspanTd}`);
          console.log(`      transform: ${tdStyles.transform}, translate: ${(tdStyles as any).translate || 'n/a'}`);
        });

        // Ancestor diagnostics
        console.log(`\n  🔍 Ancestor Chain:`);
        let current: HTMLElement | null = row as HTMLElement;
        let level = 0;
        while (current && level < 6) {
          const styles = window.getComputedStyle(current);
          const rect = current.getBoundingClientRect();
          const tag = current.tagName.toLowerCase();
          const cls = current.className ? `.${current.className.split(' ').join('.')}` : '';
          
          console.log(`    [${level}] ${tag}${cls}:`);
          console.log(`      rect.left: ${rect.left.toFixed(2)}px`);
          console.log(`      display: ${styles.display}`);
          console.log(`      position: ${styles.position}`);
          console.log(`      transform: ${styles.transform}`);
          console.log(`      left: ${styles.left}`);
          
          if (styles.transform !== 'none') {
            console.log(`      ⚠️  NON-NONE TRANSFORM DETECTED!`);
          }
          if (styles.left !== 'auto' && styles.left !== '0px') {
            console.log(`      ⚠️  NON-AUTO LEFT DETECTED!`);
          }
          
          current = current.parentElement;
          level++;
        }

        // Apply fixes
        console.log(`\n  🔧 Applying Fixes:`);
        
        // Fix TR-level transforms
        const rowEl = row as HTMLElement;
        if (rowStyles.transform !== 'none') {
          console.log(`    - Neutralizing TR transform`);
          rowEl.style.transform = 'none';
          (rowEl.style as any).translate = 'none';
          fixedCount++;
        }
        if (rowStyles.left !== 'auto' && rowStyles.left !== '0px') {
          console.log(`    - Neutralizing TR left`);
          rowEl.style.left = 'auto';
          fixedCount++;
        }
        if (rowStyles.marginLeft !== '0px') {
          console.log(`    - Neutralizing TR marginLeft`);
          rowEl.style.marginLeft = '0';
          fixedCount++;
        }
        
        // Fix TD-level transforms
        tds.forEach((td, idx) => {
          const tdStyles = window.getComputedStyle(td);
          if (tdStyles.transform !== 'none') {
            console.log(`    - Neutralizing TD[${idx}] transform`);
            td.style.transform = 'none';
            (td.style as any).translate = 'none';
            fixedCount++;
          }
          if (tdStyles.left !== 'auto' && tdStyles.left !== '0px') {
            console.log(`    - Neutralizing TD[${idx}] left`);
            td.style.left = 'auto';
            fixedCount++;
          }
          if (tdStyles.marginLeft !== '0px') {
            console.log(`    - Neutralizing TD[${idx}] marginLeft`);
            td.style.marginLeft = '0';
            fixedCount++;
          }
        });
        
        // Handle ghost TDs if present
        if (tds.length > 1 && colspanTd && tds[0] !== colspanTd) {
          console.log(`    - Hiding ghost TDs before colspan TD`);
          
          for (let i = 0; i < tds.length; i++) {
            if (tds[i] === colspanTd) break;
            
            const ghostTd = tds[i];
            ghostTd.style.display = 'none';
            ghostTd.style.width = '0';
            ghostTd.style.padding = '0';
            ghostTd.style.border = '0';
            console.log(`      - Hidden TD[${i}]`);
          }
          
          colspanTd.colSpan = colCount;
          colspanTd.style.paddingLeft = '0';
          colspanTd.style.paddingRight = '0';
          fixedCount++;
        }
        
        if (fixedCount === 0) {
          console.log(`    ✅ No fixes needed`);
        } else {
          console.log(`    ✅ Applied fixes`);
        }
      });

      console.log(`\n${"=".repeat(50)}`);
      console.log(`✅ Normalization complete: ${fixedCount} fixes applied`);
      console.groupEnd();
      
      return fixedCount > 0;
    };

    const findScroller = () => {
      // Try common Syncfusion scroll containers
      const candidates = [
        document.querySelector("#sprint-board .e-kanban-content"),
        document.querySelector("#sprint-board .e-kanban-content .e-swimlane"),
        ...Array.from(document.querySelectorAll("#sprint-board *"))
      ];

      for (const el of candidates) {
        if (!el) continue;
        const styles = window.getComputedStyle(el as HTMLElement);
        if (styles.overflowX === 'auto' || styles.overflowX === 'scroll') {
          return el as HTMLElement;
        }
      }
      return null;
    };

    const measureAlignment = (trigger: string) => {
      measureCount++;

      const headerFirstTh = document.querySelector("#sprint-board .e-header-table th.e-header-cells") as HTMLElement;
      const contentFirstTd = document.querySelector("#sprint-board .e-content-table td.e-content-cells[data-key]") as HTMLElement;
      const swimlaneRows = document.querySelectorAll("#sprint-board .e-content-table tr.e-content-row.e-swimlane-row");
      const headerContainer = document.querySelector("#sprint-board .e-kanban-header") as HTMLElement;
      const contentScroller = findScroller();

      if (!headerFirstTh || !contentFirstTd || swimlaneRows.length === 0) {
        console.log(`[${trigger}] Elements not ready yet...`);
        return false;
      }

      // Run normalization before measurement if enabled
      let wasFixed = false;
      if (NORMALIZE_SWIMLANES) {
        wasFixed = normalizeSwimlaneRows();
        if (wasFixed) {
          console.log(`🔄 DOM updated by normalization, remeasuring in 50ms...`);
          setTimeout(() => measureAlignment(`${trigger}-after-fix`), 50);
          return true;
        }
      }

      // Apply auto-correction after normalization
      if (AUTO_CORRECT_DRIFT) {
        autoCorrectSwimlaneDrift();
      }

      console.log(`\n${"=".repeat(60)}`);
      console.log(`SWIMLANE ALIGNMENT DEBUG #${measureCount} (${trigger})`);
      console.log("=".repeat(60));

      const headerFirstThLeft = headerFirstTh.getBoundingClientRect().left;
      const contentFirstTdLeft = contentFirstTd.getBoundingClientRect().left;

      console.log("\n📍 REFERENCE POSITIONS:");
      console.log(`  Header First Cell (th):  ${headerFirstThLeft.toFixed(2)}px`);
      console.log(`  Content First Cell (td): ${contentFirstTdLeft.toFixed(2)}px`);
      console.log(`  Delta (header - content): ${(headerFirstThLeft - contentFirstTdLeft).toFixed(2)}px`);

      // Scroll state
      console.log("\n📜 SCROLL STATE:");
      if (contentScroller) {
        console.log(`  Content Scroller:`);
        console.log(`    scrollLeft: ${contentScroller.scrollLeft}px`);
        console.log(`    clientWidth: ${contentScroller.clientWidth}px`);
        console.log(`    scrollWidth: ${contentScroller.scrollWidth}px`);
      } else {
        console.log(`  ⚠️  No horizontal scroller detected`);
      }
      if (headerContainer) {
        console.log(`  Header Container:`);
        console.log(`    scrollLeft: ${headerContainer.scrollLeft}px`);
        console.log(`    clientWidth: ${headerContainer.clientWidth}px`);
      }

      // Per-swimlane measurements
      console.log("\n🏊 PER-SWIMLANE MEASUREMENTS:");
      console.log("─".repeat(60));
      
      const swimlaneData: Array<{
        name: string;
        tdLeft: number;
        headerLeft: number;
        deltaTdVsContent: number;
        deltaHeaderVsTd: number;
        deltaHeaderVsContent: number;
      }> = [];

      swimlaneRows.forEach((row, index) => {
        const swimlaneTd = row.querySelector("td.e-content-cells[colspan]") as HTMLElement;
        const swimlaneHeader = row.querySelector(".e-swimlane-header") as HTMLElement;
        const swimlaneText = row.querySelector(".e-swimlane-text") as HTMLElement;
        
        if (!swimlaneTd || !swimlaneHeader) return;

        const name = swimlaneText?.textContent?.trim() || `Swimlane ${index + 1}`;
        const tdLeft = swimlaneTd.getBoundingClientRect().left;
        const headerLeft = swimlaneHeader.getBoundingClientRect().left;
        
        const deltaTdVsContent = tdLeft - contentFirstTdLeft;
        const deltaHeaderVsTd = headerLeft - tdLeft;
        const deltaHeaderVsContent = headerLeft - contentFirstTdLeft;

        swimlaneData.push({
          name,
          tdLeft,
          headerLeft,
          deltaTdVsContent,
          deltaHeaderVsTd,
          deltaHeaderVsContent
        });

        console.log(`\n  ${name}:`);
        console.log(`    TD left:     ${tdLeft.toFixed(2)}px`);
        console.log(`    Header left: ${headerLeft.toFixed(2)}px`);
        console.log(`    TD vs Content:     ${deltaTdVsContent.toFixed(2)}px ${Math.abs(deltaTdVsContent) > 1 ? '❌' : '✅'}`);
        console.log(`    Header vs TD:      ${deltaHeaderVsTd.toFixed(2)}px ${Math.abs(deltaHeaderVsTd) > 1 ? '❌' : '✅'}`);
        console.log(`    Header vs Content: ${deltaHeaderVsContent.toFixed(2)}px ${Math.abs(deltaHeaderVsContent) > 1 ? '❌' : '✅'}`);
      });

      // Diagnosis
      console.log("\n🔍 DIAGNOSIS:");
      const anyTdOffset = swimlaneData.some(d => Math.abs(d.deltaTdVsContent) > 1);
      const anyHeaderOffset = swimlaneData.some(d => Math.abs(d.deltaHeaderVsTd) > 1);
      const headerContentMismatch = Math.abs(headerFirstThLeft - contentFirstTdLeft) > 1;

      if (anyTdOffset) {
        console.log("  ❌ CASE 1: One or more swimlane TDs are offset from content cells");
        swimlaneData.filter(d => Math.abs(d.deltaTdVsContent) > 1).forEach(d => {
          console.log(`     - ${d.name}: ${d.deltaTdVsContent.toFixed(2)}px offset`);
        });
      }
      if (anyHeaderOffset) {
        console.log("  ❌ CASE 2: One or more swimlane headers are offset inside their TDs");
        swimlaneData.filter(d => Math.abs(d.deltaHeaderVsTd) > 1).forEach(d => {
          console.log(`     - ${d.name}: ${d.deltaHeaderVsTd.toFixed(2)}px offset`);
        });
      }
      if (headerContentMismatch) {
        console.log("  ❌ CASE 3: Header and content tables have different alignment");
        console.log(`     - Delta: ${(headerFirstThLeft - contentFirstTdLeft).toFixed(2)}px`);
      }
      if (!anyTdOffset && !anyHeaderOffset && !headerContentMismatch) {
        console.log("  ✅ All swimlanes aligned within 1px tolerance");
      }

      // Visual overlay code REMOVED - no more debug lines

      console.log("\n" + "=".repeat(60) + "\n");

      return true;
    };

    // Run auto-correction immediately on mount
    if (AUTO_CORRECT_DRIFT) {
      requestAnimationFrame(() => {
        setTimeout(() => autoCorrectSwimlaneDrift(), 0);
      });
    }

    // Run normalization and measurement at multiple timings
    const timeout0 = setTimeout(() => measureAlignment("0ms"), 0);
    const timeout250 = setTimeout(() => measureAlignment("250ms"), 250);
    const timeout750 = setTimeout(() => measureAlignment("750ms"), 750);
    const timeout1500 = setTimeout(() => measureAlignment("1500ms"), 1500);

    // MutationObserver for swimlane normalization on DOM changes
    let normalizeTimeout: NodeJS.Timeout;
    const normalizeObserver = new MutationObserver(() => {
      // Debounce normalization and correction
      clearTimeout(normalizeTimeout);
      normalizeTimeout = setTimeout(() => {
        if (NORMALIZE_SWIMLANES) {
          const fixed = normalizeSwimlaneRows();
          if (fixed && DEBUG_ALIGN) {
            setTimeout(() => measureAlignment("mutation-after-fix"), 50);
          }
        }
        if (AUTO_CORRECT_DRIFT) {
          autoCorrectSwimlaneDrift();
        }
      }, 100);
    });

    const contentTableBody = document.querySelector("#sprint-board .e-content-table tbody");
    if (contentTableBody && NORMALIZE_SWIMLANES) {
      normalizeObserver.observe(contentTableBody, {
        childList: true,
        subtree: true,
        attributes: false
      });
    }

    // Window resize handler
    const handleResize = () => {
      clearTimeout(normalizeTimeout);
      normalizeTimeout = setTimeout(() => {
        if (NORMALIZE_SWIMLANES) {
          normalizeSwimlaneRows();
        }
        if (AUTO_CORRECT_DRIFT) {
          autoCorrectSwimlaneDrift();
        }
      }, 100);
    };

    window.addEventListener("resize", handleResize);

    // Scroll listener
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (AUTO_CORRECT_DRIFT) {
          autoCorrectSwimlaneDrift();
        }
        if (DEBUG_ALIGN) {
          measureAlignment("scroll");
        }
      }, 100);
    };

    const scroller = findScroller();
    if (scroller && DEBUG_ALIGN) {
      scroller.addEventListener("scroll", handleScroll);
    }

    return () => {
      clearTimeout(timeout0);
      clearTimeout(timeout250);
      clearTimeout(timeout750);
      clearTimeout(timeout1500);
      clearTimeout(scrollTimeout);
      clearTimeout(normalizeTimeout);
      normalizeObserver.disconnect();
      overlayKiller.disconnect();
      window.removeEventListener("resize", handleResize);
      if (scroller) {
        scroller.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  // Close menu on outside click or escape key
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          menuButtonRef.current && !menuButtonRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  // Fetch ServiceNow agile snapshot on mount
  useEffect(() => {
    async function loadSnapshot() {
      try {
        setLoadingSnapshot(true);
        console.log(`[HelloWidget] Loading snapshot via ${getRuntimeEnvironment()}`);
        const data = await getAgileSnapshot();
        setSnapshot(data);
        console.log('[HelloWidget] ServiceNow snapshot loaded:', data);
      } catch (e: any) {
        const errorMsg = e?.message ?? 'Failed to load snapshot';
        setSnapshotError(errorMsg);
        console.error('[HelloWidget] ServiceNow snapshot error:', errorMsg);
      } finally {
        setLoadingSnapshot(false);
      }
    }
    loadSnapshot();
  }, []);

  const teamMembers = [
    { name: 'Eugene Chuvyrov', initials: 'EC' },
    { name: 'Nick Diaz', initials: 'ND' },
    { name: 'Nicola Attico', initials: 'NA' },
    { name: 'Grant Hulbert', initials: 'GH' }
  ];

  const tabs = ['Backlog', 'Sprint Planning', 'Sprint Tracking'];

  const handleMenuAction = (action: string) => {
    console.log(`Quick Action: ${action}`);
    setIsMenuOpen(false);
    
    switch (action) {
      case 'labels':
        console.log('Open labels/tags manager');
        break;
      case 'activity':
        console.log('Show activity feed');
        break;
      case 'settings':
        console.log('Open board settings');
        break;
      case 'clear-filters':
        setSearchQuery('');
        setSortBy('due-date');
        console.log('Filters cleared');
        break;
      case 'refresh':
        console.log('Refresh board data');
        break;
    }
  };

  // Handle card drag/drop to update ServiceNow state
  const handleCardDragStop = async (args: any) => {
    try {
      const droppedCard = args.data[0];
      
      // Don't sync placeholder cards
      if (droppedCard.IsPlaceholder) {
        console.log('[DragStop] Ignoring placeholder card');
        return;
      }

      const taskId = droppedCard.Id;
      const newState = droppedCard.Status;

      console.log(`[DragStop] Updating task ${taskId} to state: ${newState}`);

      // Update task state via MCP client (auto-detects MCP vs REST)
      const result = await updateTaskState({ taskId, state: newState });

      if (result.ok === false) {
        throw new Error(result.error || 'Failed to update task');
      }

      console.log('[DragStop] Task updated successfully, refreshing snapshot...');

      // Re-fetch snapshot to get server truth
      const newSnapshot = await getAgileSnapshot();
      setSnapshot(newSnapshot);
      console.log('[DragStop] Snapshot refreshed');

    } catch (error: any) {
      console.error('[DragStop] Error:', error);
      alert(`Failed to update ServiceNow — reloading\n${error.message}`);

      // Re-fetch snapshot to revert to server truth
      try {
        const newSnapshot = await getAgileSnapshot();
        setSnapshot(newSnapshot);
      } catch (refreshError) {
        console.error('[DragStop] Failed to refresh after error:', refreshError);
      }
    }
  };

  // Transform ServiceNow snapshot to Kanban data
  const kanban = snapshot ? buildKanbanData(snapshot) : null;
  
  // Determine data source: use ServiceNow data if available, otherwise fallback
const useFallback = !!snapshotError || !kanban;
const kanbanDataSource = useFallback ? sprintData : kanban.cards;


  return (
    <div className="hello-widget">
      <div className="board-card">
        <header className="board-header">
          <div className="sn-logo">SN</div>
          <div className="board-header-text">
            <div className="board-title">Sprint Command</div>
            <div className="board-subtitle">ServiceNow Agile Board</div>
          </div>
        </header>

        {/* Dashboard Command Bar */}
        <div className="command-bar">
          {/* Navigation Tabs */}
          <div className="command-bar-nav">
            {tabs.map(tab => (
              <button
                key={tab}
                className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                title={tab}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Team Members Row */}
          <div className="command-bar-team">
            <div className="team-label">Team:</div>
            <div className="team-chips">
              {teamMembers.map(member => (
                <div key={member.initials} className="team-chip" title={member.name}>
                  <div className="team-avatar">{member.initials}</div>
                  <span className="team-name">{member.name}</span>
                </div>
              ))}
              <button className="team-chip team-add" title="Add team member">
                <div className="team-avatar">+</div>
              </button>
            </div>
          </div>

          {/* Controls Row */}
          <div className="command-bar-controls">
            <div className="control-group">
              <input
                type="text"
                className="search-input"
                placeholder="Filter by title or number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                title="Search cards"
              />
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                title="Sort cards"
              >
                <option value="due-date">Due by</option>
                <option value="priority">Priority</option>
                <option value="assignee">Assignee</option>
                <option value="status">Status</option>
              </select>
            </div>
            
            {/* Kebab Menu */}
            <div className="kebab-menu-container">
              <button
                ref={menuButtonRef}
                className="kebab-btn"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                title="Quick actions"
                aria-label="Quick actions menu"
                aria-expanded={isMenuOpen}
              >
                ⋮
              </button>
              
              {isMenuOpen && (
                <div
                  ref={menuRef}
                  className="kebab-menu"
                  role="menu"
                >
                  <button
                    className="menu-item"
                    onClick={() => handleMenuAction('labels')}
                    role="menuitem"
                  >
                    <span className="menu-icon">🏷️</span>
                    <span className="menu-label">Labels</span>
                  </button>
                  <button
                    className="menu-item"
                    onClick={() => handleMenuAction('activity')}
                    role="menuitem"
                  >
                    <span className="menu-icon">📋</span>
                    <span className="menu-label">Activity</span>
                  </button>
                  <button
                    className="menu-item"
                    onClick={() => handleMenuAction('settings')}
                    role="menuitem"
                  >
                    <span className="menu-icon">⚙️</span>
                    <span className="menu-label">Settings</span>
                  </button>
                  <div className="menu-divider"></div>
                  <button
                    className="menu-item"
                    onClick={() => handleMenuAction('clear-filters')}
                    role="menuitem"
                    disabled={!searchQuery && sortBy === 'due-date'}
                  >
                    <span className="menu-icon">🔄</span>
                    <span className="menu-label">Clear Filters</span>
                  </button>
                  <button
                    className="menu-item"
                    onClick={() => handleMenuAction('refresh')}
                    role="menuitem"
                  >
                    <span className="menu-icon">↻</span>
                    <span className="menu-label">Refresh Board</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loadingSnapshot && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '360px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px'
          }}>
            Loading sprint from ServiceNow…
          </div>
        )}

        {/* Error State */}
        {!loadingSnapshot && snapshotError && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: '6px',
            color: 'rgba(255, 150, 150, 0.9)',
            fontSize: '12px',
            marginBottom: '12px'
          }}>
            ServiceNow unavailable — showing demo data
          </div>
        )}

        {/* Kanban Board */}
        {!loadingSnapshot && (
          <KanbanComponent
            id="sprint-board"
            keyField="Status"
            dataSource={kanbanDataSource}
            swimlaneSettings={{
              keyField: "StoryId",
              textField: "StoryTitle"
            }}
            cardSettings={{
              headerField: "Title",
              contentField: "Assignee"
            }}
            dragStop={handleCardDragStop}
            height="360px"
          >
            <ColumnsDirective>
              <ColumnDirective headerText="Draft" keyField="Draft" />
              <ColumnDirective headerText="Ready" keyField="Ready" />
              <ColumnDirective headerText="Work in Progress" keyField="Work in Progress" />
              <ColumnDirective headerText="Complete" keyField="Complete" />
              <ColumnDirective headerText="Cancelled" keyField="Cancelled" />
            </ColumnsDirective>
          </KanbanComponent>
        )}
      </div>
    </div>
  );
}

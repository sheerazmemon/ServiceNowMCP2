import Head from "next/head";
import { useEffect, useState } from "react";

export default function Home() {
  const [widgetUrl, setWidgetUrl] = useState("/widget/index.html");

  useEffect(() => {
    // Forward query parameters from current page to widget
    // Example: if page is /?mcp=1, widget becomes /widget/index.html?mcp=1
    if (typeof window !== "undefined" && window.location.search) {
      setWidgetUrl(`/widget/index.html${window.location.search}`);
    }
  }, []);

  return (
    <>
      <Head>
        <title>React ChatGPT MCP</title>
      </Head>
      <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: "20px" }}>
        <h1>React ChatGPT MCP</h1>
        <p>
          The MCP server is available at <code>/mcp</code> once deployed.
        </p>
        <p>
          Build the widget with <code>npm run build:widget</code> before
          starting the server.
        </p>
        
        <h2>Widget Preview</h2>
        <p>
          <a href={widgetUrl} target="_blank">Open Widget in New Tab</a>
        </p>
        
        <div style={{ 
          border: "2px solid #ccc", 
          borderRadius: "8px", 
          overflow: "hidden",
          marginTop: "20px"
        }}>
          <iframe 
            src={widgetUrl}
            style={{ 
              width: "100%", 
              height: "600px", 
              border: "none" 
            }}
            title="Kanban Widget"
          />
        </div>
        
        <h2>API Endpoints</h2>
        <ul>
          <li><a href="/api/servicenow/test" target="_blank">/api/servicenow/test</a> - Test ServiceNow connection</li>
          <li><a href="/api/servicenow/discover" target="_blank">/api/servicenow/discover</a> - Discover available tables</li>
        </ul>
      </main>
    </>
  );
}

import { InsightsData } from './types';

/**
 * Opens a new window and displays insights in it
 * @param insights The insights data to display
 * @returns A function that can be called to close the popup window
 */
export function openInsightsPopup(insights: InsightsData): () => void {
  // Create a new window
  const popup = window.open('', 'insights', 'width=1200,height=800');
  
  if (!popup) {
    console.error('Failed to open popup window. Check if popup blockers are enabled.');
    return () => {};
  }

  // Write the HTML content to the new window
  popup.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Meeting Decision Insights</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          @media print {
            body {
              padding: 20px;
            }
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script>
          // Store the insights data in the window for access by React
          window.INSIGHTS_DATA = ${JSON.stringify(insights)};
        </script>
      </body>
    </html>
  `);

  // Get the current app's scripts and stylesheets
  const scripts = Array.from(document.querySelectorAll('script'))
    .filter(script => script.src && !script.src.includes('hmr'))
    .map(script => script.src);
  
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map(link => (link as HTMLLinkElement).href);

  // Append the scripts to the new window
  scripts.forEach(src => {
    const script = popup.document.createElement('script');
    script.src = src;
    script.type = 'module';
    popup.document.body.appendChild(script);
  });

  // Append the styles to the new window
  styles.forEach(href => {
    const link = popup.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    popup.document.head.appendChild(link);
  });

  // Add a script to render the insights component
  const renderScript = popup.document.createElement('script');
  renderScript.textContent = `
    window.addEventListener('load', () => {
      if (window.React && window.ReactDOM) {
        // Wait for React to be loaded
        const DirectInsightsPage = window.DirectInsightsPage;
        if (DirectInsightsPage) {
          try {
            ReactDOM.render(
              React.createElement(DirectInsightsPage, { insights: window.INSIGHTS_DATA }),
              document.getElementById('root')
            );
          } catch (err) {
            console.error('Failed to render insights:', err);
            document.body.innerHTML = '<div class="p-4"><h1 class="text-xl font-bold text-red-500">Error rendering insights</h1><p>' + err.message + '</p></div>';
          }
        } else {
          console.error('DirectInsightsPage component not found');
          document.body.innerHTML = '<div class="p-4"><h1 class="text-xl font-bold text-red-500">Error</h1><p>DirectInsightsPage component not found</p></div>';
        }
      } else {
        console.error('React not loaded');
        document.body.innerHTML = '<div class="p-4"><h1 class="text-xl font-bold text-red-500">Error</h1><p>React not loaded</p></div>';
      }
    });
  `;
  popup.document.body.appendChild(renderScript);

  // Return a function to close the popup
  return () => {
    if (!popup.closed) {
      popup.close();
    }
  };
} 
const SCRIPT = `(function(){try{var s=localStorage.getItem("theme");var d=s==="dark"||(!s&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;

/** Sets the theme before first paint so the shell never flashes the wrong one. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}

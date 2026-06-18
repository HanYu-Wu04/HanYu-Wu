const hanYuArt = String.raw`
██╗  ██╗  █████╗  ███╗   ██╗██╗   ██╗██╗   ██╗
██║  ██║ ██╔══██╗ ████╗  ██║╚██╗ ██╔╝██║   ██║
███████║ ███████║ ██╔██╗ ██║ ╚████╔╝ ██║   ██║
██╔══██║ ██╔══██║ ██║╚██╗██║  ╚██╔╝  ██║   ██║
██║  ██║ ██║  ██║ ██║ ╚████║   ██║   ╚██████╔╝
╚═╝  ╚═╝ ╚═╝  ╚═╝ ╚═╝  ╚═══╝   ╚═╝    ╚═════╝
`;

const wuArt = String.raw`
██╗    ██╗██╗   ██╗
██║    ██║██║   ██║
██║ █╗ ██║██║   ██║
██║███╗██║██║   ██║
╚███╔███╔╝╚██████╔╝
 ╚══╝╚══╝  ╚═════╝
`;

const baseStyle = [
  'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  'font-size: 16px',
  'font-weight: 900',
  'line-height: 1',
  'letter-spacing: 0',
].join(';');

const hanYuStyle = [
  baseStyle,
  'color: #0ea5e9',
  'text-shadow: 2px 0 0 rgba(14, 165, 233, 0.38), 0 0 10px rgba(14, 165, 233, 0.72)',
].join(';');

const wuStyle = [
  baseStyle,
  'color: #ffffff',
  'text-shadow: 2px 0 0 rgba(255, 255, 255, 0.35), 0 0 10px rgba(255, 255, 255, 0.68)',
].join(';');

const captionStyle = [
  'color: #94a3b8',
  'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  'font-size: 12px',
  'font-weight: 700',
  'letter-spacing: 0.18em',
  'text-transform: uppercase',
].join(';');

declare global {
  interface Window {
    __hanYuConsoleBrandPrinted?: boolean;
  }
}

export function printConsoleBrand() {
  console.log(
    '%c%s%c%s%cBUILDING SINCE 2021',
    hanYuStyle,
    hanYuArt,
    wuStyle,
    wuArt,
    captionStyle
  );
}

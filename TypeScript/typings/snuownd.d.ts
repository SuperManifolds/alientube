declare module SnuOwnd {
    export function getParser() : snu0wndParser;

    interface snu0wndParser {
        render(markdownString : string);
    }
}

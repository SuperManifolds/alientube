// Type definitions for Safari Web Browser API
// Project: https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/
// Definitions by: Alex Sørlie Glomsaas <https://github.com/xlexi/>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

// required lib.d.ts

declare module safari.self {
    export function addEventListener(type: string, callback:any, useCapture:boolean);
}

declare module safari.self.tab {
    export function dispatchMessage(name: string, object:any);
}

declare module safari.extension {
    var baseURI: string;
    export function getURL(path: string);
}

import '@src/sass/debug.sass';
import { ReaderApi } from './ReaderApi';

declare global {
    interface Window {
        debug: Debug;
    }
}

class Debug {
    constructor() {
        this.initUI();
        ReaderApi.getInstance().initDebug();
    }

    private initUI() {
        const debugDiv = document.createElement("div");
        debugDiv.id = "debug";
        document.body.appendChild(debugDiv);

        debugDiv.appendChild(this.createButton("Prev", () => ReaderApi.getInstance().prevPage()));
        debugDiv.appendChild(this.createButton("Main", () => ReaderApi.getInstance().main()));
        debugDiv.appendChild(this.createButton("Next", () => ReaderApi.getInstance().nextPage()));
    }

    private createButton(innerText: string, onclick: (this: GlobalEventHandlers, ev: MouseEvent) => any) {
        const button = document.createElement("button");
        button.innerText = innerText;
        button.onclick = onclick;
        return button;
    }

    static getInstance() {
        window.debug ??= new Debug();
        return window.debug;
    }
}

window.debug ??= Debug.getInstance();
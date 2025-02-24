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
    }

    private get readerApi(): ReaderApi {
        return ReaderApi.getInstance();
    }

    private initUI() {
        const debugDiv = document.createElement("div");
        debugDiv.id = "debug";
        document.body.appendChild(debugDiv);

        debugDiv.appendChild(this.createButton("Prev", () => this.readerApi.prevPage()));
        debugDiv.appendChild(this.createButton("Main", () => this.readerApi.main()));
        debugDiv.appendChild(this.createButton("Next", () => this.readerApi.nextPage()));
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
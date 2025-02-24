import {ReaderApi} from "../ReaderApi";
import {TextNodeUtils} from "../utils/TextNodeUtils";
import {CommunicationService} from "./CommunicationService";

export class TtsService {
    private nodeList: Array<Node> = [];
    private previousPlayedNode: Node | null = null;
    private get readerApi(): ReaderApi {
        return ReaderApi.getInstance();
    }

    constructor() {
        CommunicationService.register('ttsPlay', this.play.bind(this));
        CommunicationService.register('ttsNext', this.next.bind(this));
        CommunicationService.register('ttsStop', this.stop.bind(this));
    }

    send(): void {
        if (this.nodeList[0]) {
            CommunicationService.send('ttsPlay', this.nodeList[0].textContent);
        }
    }

    play(): void {
        let isVisible = false;
        this.nodeList = this.readerApi.textNodeList
            .filter((node) => {
                isVisible ||= TextNodeUtils.isVisible(node);
                return isVisible;
            });
        this.send();
    }

    next(): void {
        if (this.nodeList.length === 0) {
            if (this.readerApi.isAtEnd) {
                CommunicationService.send('ttsEnd');
                return;
            }
            // Flipping the page.
            this.readerApi.nextPage().then(() => {
                this.nodeList = this.readerApi.textNodeList
                    .filter((node) => TextNodeUtils.isVisible(node) && node !== this.previousPlayedNode);
                this.send();
            });
        } else {
            this.previousPlayedNode = this.nodeList.shift();
            this.send();
        }
    }

    stop(): void {
        this.nodeList = [];
        this.previousPlayedNode = null;
    }

    static getInstance(): TtsService {
        window.ttsService ??= new TtsService();
        return window.ttsService
    }
}
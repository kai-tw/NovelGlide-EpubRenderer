import {ReaderApi} from "./ReaderApi";
import {CommunicationService} from "./services/CommunicationService";
import {TtsService} from "./services/TtsService";

declare global {
    interface Window {
        readerApi: ReaderApi;
        communicationService: CommunicationService;
        ttsService: TtsService;
    }
}
import {ReaderApi} from "./ReaderApi";
import {CommunicationService} from "./services/CommunicationService";
import {TtsService} from "./services/TtsService";
import {SearchService} from "./services/SearchService";

declare global {
    interface Window {
        readerApi: ReaderApi;
        communicationService: CommunicationService;
        ttsService: TtsService;
        searchService: SearchService;
    }
}
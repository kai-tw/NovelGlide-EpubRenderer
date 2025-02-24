import '@src/sass/main.sass';
import { ReaderApi } from './ReaderApi';
import {TtsService} from "@src/services/TtsService";
import {CommunicationService} from "@src/services/CommunicationService";

window.readerApi ??= ReaderApi.getInstance();
window.communicationService ??= CommunicationService.getInstance();
window.ttsService ??= TtsService.getInstance();

import '@src/sass/main.sass';
import { ReaderApi } from './ReaderApi';

window.readerApi ??= ReaderApi.getInstance();

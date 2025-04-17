export class CommunicationService {
    private channel: any = null;
    private keyMap: Map<string, Function> = new Map();

    /**
     * Set the channel for communication.
     * Called by the dart.
     */
    setChannel (channel: any) {
        this.channel = channel;
    }

    /**
     * Send a message to the dart.
     */
    send(route: string, data: any = ""): void {
        if (this.channel) {
            this.channel.postMessage(JSON.stringify({
                route: route,
                data: data,
            }));
        } else {
            console.log(route, data);
        }
    }

    /**
     * Receive a message from the dart.
     * Called by the dart.
     */
    receive(route: string, data: any): void {
        if (this.keyMap.has(route)) {
            this.keyMap.get(route)(data);
        }
    }

    /**
     * Register a callback for a route.
     */
    register(route: string, callback: Function): void {
        this.keyMap.set(route, callback);
    }

    /**
     * Get the instance of the CommunicationService.
     */
    static getInstance(): CommunicationService {
        window.communicationService ??= new CommunicationService();
        return window.communicationService;
    }

    /**
     * Send a message to the dart.
     */
    static send(route: string, data: any = ""): void {
        CommunicationService.getInstance().send(route, data);
    }

    /**
     * Register a callback for a route.
     */
    static register(route: string, callback: Function): void {
        CommunicationService.getInstance().register(route, callback);
    }
}
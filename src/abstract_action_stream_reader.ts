import {IAction, ActionObserver} from './types';

export abstract class ActionStreamReader {
    private observersByTransaction: Map<
        string,
        Map<string, Array<ActionObserver<IAction>>>
    > = new Map();

    /**
     * In kafka land, streamId would be a topic.
     * This should tap into some stream source, deserialize if necessary, and MUST call dispatchActionToObservers.
     *
     * There is no need to perform any filtering here; only actions in a transaction
     * that we are actively observing will be broadcasted.
     *
     * Ideally, this is idempotent. We shouldn't try to subscribe when we know we have before.
     * It is up to the implementer to memoize to prevent that.
     */
    public abstract subscribeToStream(streamId: string): Promise<void>;

    public stop = async () => {
        await this.unsubscribeAll();
        this.observersByTransaction.clear();
    };

    public startTransaction(transactionId: string) {
        if (this.observersByTransaction.has(transactionId)) {
            throw new Error('Trying to start a transaction that has already started');
        }

        this.observersByTransaction.set(transactionId, new Map());
    }

    public stopTransaction(transactionId: string) {
        this.observersByTransaction.delete(transactionId);
    }

    public registerStreamObserver({
        transactionId,
        streamId,
        observer
    }: {
        transactionId: string;
        streamId: string;
        observer: ActionObserver<IAction>;
    }) {
        const streamObserversForTransaction =
            this.observersByTransaction.get(transactionId) || new Map();

        const streamObservers = streamObserversForTransaction.get(streamId) || [];

        streamObserversForTransaction.set(streamId, [...streamObservers, observer]);
    }

    /**
     * Tear down subscriptions and do any additional work to clean up.
     * Hanging observers will be cleared out automatically.
     */
    protected abstract unsubscribeAll(): Promise<void>;

    // @ts-ignore
    protected dispatchActionToObservers(streamId: string, action: IAction) {
        const streamObserversForTransaction = this.observersByTransaction.get(
            action.transaction_id
        );

        if (!streamObserversForTransaction) {
            return;
        }

        const streamObservers = streamObserversForTransaction.get(streamId) || [];

        streamObservers.forEach((notify) => notify(action));
    }
}

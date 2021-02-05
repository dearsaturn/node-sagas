import uuid from 'uuid';
import {Consumer, Kafka, ConsumerConfig} from 'kafkajs';

import {transformKafkaMessageToAction} from './transform_kafka_message_to_action';
import {TopicAdministrator} from './topic_administrator';
import {isKafkaJSProtocolError} from './type_guard';
import {ActionStreamReader} from './abstract_action_stream_reader';

export class ConsumerPool extends ActionStreamReader {
    private topicAdministrator: TopicAdministrator;
    private consumers: Map<string, Consumer> = new Map();

    constructor(
        private kafka: Kafka,
        private rootTopic: string,
        private consumerConfig: Omit<ConsumerConfig, 'groupId' | 'allowAutoTopicCreation'> = {},
        topicAdministrator?: TopicAdministrator
    ) {
        super();
        this.topicAdministrator = topicAdministrator || new TopicAdministrator(kafka);
    }

    public async subscribeToStream(topic: string) {
        if (this.consumers.has(topic)) {
            return;
        }

        const consumer = this.kafka.consumer({
            groupId: `${this.rootTopic}-${uuid.v4()}`,
            ...this.consumerConfig
        });

        await consumer.connect();

        try {
            await consumer.subscribe({topic});
        } catch (error) {
            if (isKafkaJSProtocolError(error) && error.type === 'UNKNOWN_TOPIC_OR_PARTITION') {
                await this.topicAdministrator.createTopic(topic);
            } else {
                throw error;
            }
        }

        this.consumers.set(topic, consumer);

        await consumer.run({
            autoCommit: true,
            autoCommitThreshold: 1,
            eachMessage: async ({message}) => {
                const action = transformKafkaMessageToAction<any>(topic, message);

                this.dispatchActionToObservers(topic, action);
            }
        });
    }

    protected unsubscribeAll = async () => {
        for (const consumer of this.consumers.values()) {
            await consumer.stop();
            await consumer.disconnect();
        }

        this.consumers.clear();
    };
}

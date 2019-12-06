import Bluebird from 'bluebird';
import {ProducerMessageBus} from '../../src/producer_message_bus';
import {IAction} from '../../src/types';
import {kafka} from './test_clients';
import {withTopicCleanup} from './kafka_utils';
import uuid from 'uuid';
import {KafkaMessage} from 'kafkajs';
import {DEFAULT_TEST_TIMEOUT} from './constants';

type TestAction = IAction<{thing: true}>;

describe(ProducerMessageBus.name, function() {
    it(
        'puts messages into the topic',
        async function() {
            await withTopicCleanup(['producer_message_bus_test'])(async ([topic]) => {
                const expectedMessage: Omit<TestAction, 'topic'> = {
                    payload: {thing: true},
                    transaction_id: '4'
                };

                const bus = new ProducerMessageBus(kafka);
                await bus.connect();
                await bus.putAction({
                    transaction_id: expectedMessage.transaction_id,
                    payload: expectedMessage.payload,
                    topic
                });

                const consumer = kafka.consumer({groupId: uuid.v4()});
                await consumer.connect();
                await consumer.subscribe({topic, fromBeginning: true});

                let receivedMessage: Omit<TestAction, 'topic'> | null = null;

                await consumer.run({
                    eachMessage: async ({message}: {message: KafkaMessage}) => {
                        receivedMessage = JSON.parse(message.value.toString());
                    }
                });

                await Bluebird.delay(250);

                expect(receivedMessage).toEqual(expectedMessage);
                await consumer.disconnect();
                await bus.disconnect();
            });
        },
        DEFAULT_TEST_TIMEOUT
    );
});

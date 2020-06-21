import pino from 'pino';
import {enums} from '@social-native/snpkg-snapi-authorization';

import {EffectBuilder} from './effect_builder';
import {ActionChannelBuffer, EphemeralBuffer} from './buffers';
import {SagaRunner} from './saga_runner';
import {EffectDescriptionKind} from './enums';

/**
 * Aliases
 */

export type ActionChannel<Payload> = IActionChannelEffectDescription<IAction<Payload>>;

/**
 * Effects
 */
export type PutEffect<Payload> = (
    pattern: string,
    payload?: Payload
) => IPutEffectDescription<Payload>;

export type TakeEffect<Payload> = (
    pattern: TakePattern
) =>
    | ITakeEffectDescription<IAction<Payload>>
    | ITakeActionChannelEffectDescription<IAction<Payload>>;

export type CallEffect<Fn extends (...args: any[]) => any> = (
    callable: (args: Parameters<Fn>) => ReturnType<Fn>,
    args?: Parameters<Fn>
) => ICallEffectDescription<Parameters<Fn>, ReturnType<Fn>>;

export type ActionChannelEffect<Payload> = (
    pattern: ActionChannelInput<IAction<Payload>>,
    actionBuffer?: ActionChannelBuffer<IAction<Payload>>
) => IActionChannelEffectDescription<IAction<Payload>>;

export type DelayEffect<Payload extends {} | undefined = undefined> = (
    delayInMilliseconds: number,
    payload?: Payload
) => IDelayEffectDescription<Payload>;

export type RaceCombinatorEffect<Payload> = (
    effects: ICombinatatorEffectDescription<IAction<Payload>>['effects']
) => ICombinatatorEffectDescription<IAction<Payload>>;

export type AllCombinatorEffect<Payload> = (
    effects: ICombinatatorEffectDescription<IAction<Payload>>['effects']
) => ICombinatatorEffectDescription<IAction<Payload>>;

// Effect Components

export interface IPredicateRecord<Action extends IAction> {
    pattern: ActionChannelInput<Action>;
    predicate(action: Action): boolean;
}

export type ActionChannelInput<Action extends IAction> =
    | string
    | string[]
    | IPredicateRecord<Action>;

export type TakePattern<Action extends IAction = IAction> =
    | ActionChannelInput<Action>
    | IActionChannelEffectDescription<Action>;

/**
 * Buffers
 */

export interface IActionBuffer<Action extends IAction> {
    put(action: Action): void;
    take(): Action | Promise<Action>;
}

/**
 * Effect Descriptions
 */
export interface IPutEffectDescription<Payload extends {}> extends IEffectDescription {
    pattern: string;
    payload?: Payload;
    kind: EffectDescriptionKind.PUT;
    topic: string;
}

export interface ITakeEffectDescription<Action extends IAction = IAction>
    extends IEffectDescription {
    patterns: TakePattern;
    kind: EffectDescriptionKind.TAKE;
    topics: string[];
    buffer: EphemeralBuffer<Action>;
    observer: ActionObserver<Action>;
}

export interface ITakeActionChannelEffectDescription<Action extends IAction = IAction>
    extends IEffectDescription {
    patterns: ActionChannelInput<Action>;
    kind: EffectDescriptionKind.TAKE_ACTION_CHANNEL;
    buffer: ActionChannelBuffer<Action>;
    topics: string[];
    observer: ActionObserver<Action>;
}

export interface ICallEffectDescription<Arguments extends any[], CallResponse>
    extends IEffectDescription {
    kind: EffectDescriptionKind.CALL;
    effect: (...args: Arguments) => CallResponse;
    args?: Arguments;
}

export interface IActionChannelEffectDescription<Action extends IAction = IAction>
    extends IEffectDescription {
    pattern: ActionChannelInput<Action>;
    kind: EffectDescriptionKind.ACTION_CHANNEL;
    buffer: ActionChannelBuffer<Action>;
    topics: string[];
    observer: ActionObserver<Action>;
}

export interface IDelayEffectDescription<Payload> extends IEffectDescription {
    kind: EffectDescriptionKind.DELAY;
    delayInMilliseconds: number;
    payload?: Payload;
}

export type ArrayCombinator<Action extends IAction> = <Combined extends Array<Promise<Action>>>(
    combined: Combined
) => Promise<Action[]>;

export type RecordCombinator<Action extends IAction> = <
    Combined extends Record<string, Promise<Action>> = Record<string, Promise<Action>>
>(
    combined: Combined
) => Promise<Record<string, Action>>;

export interface ICombinatatorEffectDescription<Action extends IAction> extends IEffectDescription {
    effects: IEffectDescription[] | Record<string, IEffectDescription>;
    combinator: ArrayCombinator<Action> | RecordCombinator<Action>;
    kind: EffectDescriptionKind.COMBINATOR;
}

export interface IEffectDescription {
    transactionId: string;
    kind: EffectDescriptionKind;
}

/**
 * Saga
 */

export type Saga<
    InitialActionPayload extends DefaultPayload = DefaultPayload,
    Context extends IBaseSagaContext = IBaseSagaContext
> = (
    initialAction: IAction<InitialActionPayload>,
    context: Context
) => Generator<
    IEffectDescription,
    any,
    UnPromisify<ReturnType<SagaRunner<IEffectDescription, Context>['runEffect']>>
>;

export type CallableSaga<
    InitialActionPayload extends DefaultPayload = DefaultPayload,
    Context extends IBaseSagaContext = IBaseSagaContext,
    Result = any
> = (payload: InitialActionPayload, context: Context) => Generator<IEffectDescription, Result, any>;

export interface IBaseSagaContext {
    effects: EffectBuilder;
    headers: Record<string, any>;
}

export type SagaContext<Extension = Record<string, any>> = IBaseSagaContext & Extension;

export type Next<
    EffectDescription extends IEffectDescription,
    Context extends SagaContext<Record<string, any>>,
    Response = any
> = (effectDescription: EffectDescription, context: Context) => Promise<Response>;

export type Middleware<
    EffectDescription extends IEffectDescription,
    Context extends SagaContext<Record<string, any>>,
    Response = any
> = (
    next: Next<EffectDescription, Context>
) => (effectDescription: EffectDescription, context: Context) => Promise<Response>;

/**
 * Utilities
 */

export type UnPromisify<T> = T extends Promise<infer U> ? U : T;

export type PromiseResolver<ResolvedValue> = (
    value?: ResolvedValue | PromiseLike<ResolvedValue> | undefined
) => void;

export type ActionObserver<Action extends IAction> = (action: Action) => void;

export interface ILoggerConfig {
    logOptions?: pino.LoggerOptions;
    logger?: ReturnType<typeof pino>;
}

export interface ISnapiHeaders {
    [enums.WORKER_USER_IDENTITY_HEADER.WORKER_USER_ID]: string;
    [enums.WORKER_USER_IDENTITY_HEADER.WORKER_USER_ROLES]: string;
    [index: string]: string | undefined;
}

/**
 * Actions
 */

export interface IAction<Payload = DefaultPayload> {
    topic: string;
    transaction_id: string;
    payload: Payload;
    userId?: string | number;
    userRoles?: string[];
}

export type DefaultPayload = Record<string, any> | undefined;

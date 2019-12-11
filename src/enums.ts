export enum BACKPRESSURE_EVENT {
    BACKPRESSURE_REACHED = 'BACKPRESSURE_REACHED',
    BACKPRESSURE_RELIEVED = 'BACKPRESSURE_RELIEVED'
}

export enum EffectDescriptionKind {
    PUT = 'PUT',
    TAKE = 'TAKE',
    CALL = 'CALL',
    COMBINATOR = 'COMBINATOR',
    ACTION_CHANNEL = 'ACTION_CHANNEL',
    TAKE_ACTION_CHANNEL = 'TAKE_ACTION_CHANNEL'
}
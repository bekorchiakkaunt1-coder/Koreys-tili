// D-29: vendor bundle entry → HV.fsrs, HV.hangul, HV.conj, HV.getPronunciation
export * as fsrs from 'ts-fsrs';
export * as hangul from 'es-hangul';
export * as conj from '@dongsa/conjugation';
export { getPronunciation } from '@dongsa/conjugation/pronunciation';

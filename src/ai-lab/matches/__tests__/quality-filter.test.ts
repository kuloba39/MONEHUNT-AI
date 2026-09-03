import {
    evaluateQuality,
    passesQualityFilter,
    QualityFilterInput
} from '../quality-filter';

describe('quality-filter', () => {

    const createInput = (
        overrides: Partial<QualityFilterInput> = {}
    ): QualityFilterInput => ({
        confluenceScore: 80,
        barrierConfidence: 50,
        entryScore: 70,
        entryReady: true,
        regime: 'TRENDING',
        ...overrides
    });


    test('passes a strong quality signal', () => {

        const result =
            evaluateQuality(
                createInput()
            );

        expect(result.passed).toBe(true);
        expect(result.qualityScore).toBe(70);
        expect(result.reason).toBe(
            'QUALITY PASSED'
        );
    });


    test('rejects unstable regime', () => {

        const result =
            evaluateQuality(
                createInput({
                    regime: 'UNSTABLE'
                })
            );

        expect(result.passed).toBe(false);
        expect(result.qualityScore).toBe(0);
        expect(result.reason).toBe(
            'UNSTABLE REGIME'
        );
    });


    test('rejects when entry is not ready', () => {

        const result =
            evaluateQuality(
                createInput({
                    entryReady: false
                })
            );

        expect(result.passed).toBe(false);
        expect(result.qualityScore).toBe(0);
        expect(result.reason).toBe(
            'ENTRY NOT READY'
        );
    });


    test('rejects low confluence', () => {

        const result =
            evaluateQuality(
                createInput({
                    confluenceScore: 50
                })
            );

        expect(result.passed).toBe(false);
        expect(result.reason).toBe(
            'CONFLUENCE BELOW THRESHOLD'
        );
    });


    test('rejects low barrier confidence', () => {

        const result =
            evaluateQuality(
                createInput({
                    barrierConfidence: 10
                })
            );

        expect(result.passed).toBe(false);
        expect(result.reason).toBe(
            'BARRIER CONFIDENCE TOO LOW'
        );
    });


    test('rejects low entry score', () => {

        const result =
            evaluateQuality(
                createInput({
                    entryScore: 30
                })
            );

        expect(result.passed).toBe(false);
        expect(result.reason).toBe(
            'ENTRY SCORE TOO LOW'
        );
    });


    test('clamps scores above 100', () => {

        const result =
            evaluateQuality(
                createInput({
                    confluenceScore: 120,
                    barrierConfidence: 120,
                    entryScore: 120
                })
            );

        expect(result.qualityScore).toBe(100);
        expect(result.passed).toBe(true);
    });


    test('clamps scores below zero', () => {

        const result =
            evaluateQuality(
                createInput({
                    confluenceScore: -20,
                    barrierConfidence: -10,
                    entryScore: -5
                })
            );

        expect(result.qualityScore).toBe(0);
        expect(result.passed).toBe(false);
    });


    test('backward-compatible quality helper works', () => {

        expect(
            passesQualityFilter(80, 15)
        ).toBe(true);

        expect(
            passesQualityFilter(79, 15)
        ).toBe(false);

        expect(
            passesQualityFilter(80, 14)
        ).toBe(false);
    });

});

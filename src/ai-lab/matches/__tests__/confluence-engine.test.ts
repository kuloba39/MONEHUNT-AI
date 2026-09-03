import {
    calculateConfluence,
    ConfluenceInput
} from '../confluence-engine';

describe('confluence-engine', () => {

    test('calculates weighted confluence correctly', () => {

        const input: ConfluenceInput = {
            fibScore: 80,
            digitScore: 70,
            entryScore: 60,
            trendScore: 90,
            regimeScore: 100
        };

        const result =
            calculateConfluence(input);

        expect(result).toBe(77);
    });


    test('returns zero when all components are zero', () => {

        const input: ConfluenceInput = {
            fibScore: 0,
            digitScore: 0,
            entryScore: 0,
            trendScore: 0,
            regimeScore: 0
        };

        expect(
            calculateConfluence(input)
        ).toBe(0);
    });


    test('returns 100 when all components are 100', () => {

        const input: ConfluenceInput = {
            fibScore: 100,
            digitScore: 100,
            entryScore: 100,
            trendScore: 100,
            regimeScore: 100
        };

        expect(
            calculateConfluence(input)
        ).toBe(100);
    });


    test('entry and digit evidence have stronger influence', () => {

        const strongEntry: ConfluenceInput = {
            fibScore: 50,
            digitScore: 100,
            entryScore: 100,
            trendScore: 50,
            regimeScore: 50
        };

        const weakEntry: ConfluenceInput = {
            fibScore: 100,
            digitScore: 40,
            entryScore: 40,
            trendScore: 100,
            regimeScore: 100
        };

        expect(
            calculateConfluence(strongEntry)
        ).toBe(75);

        expect(
            calculateConfluence(strongEntry)
        ).toBeGreaterThan(
            calculateConfluence(weakEntry)
        );
    });


    test('clamps values below zero', () => {

        const input: ConfluenceInput = {
            fibScore: -50,
            digitScore: -20,
            entryScore: -10,
            trendScore: -5,
            regimeScore: -100
        };

        expect(
            calculateConfluence(input)
        ).toBe(0);
    });


    test('clamps values above 100', () => {

        const input: ConfluenceInput = {
            fibScore: 150,
            digitScore: 120,
            entryScore: 110,
            trendScore: 200,
            regimeScore: 101
        };

        expect(
            calculateConfluence(input)
        ).toBe(100);
    });

});

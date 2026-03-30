import * as assert from 'node:assert'
import { test } from 'node:test'
import { validateMeetingTransition, MeetingStatus, canCancel } from '../meeting-state'

// To run this: npx tsx lib/__tests__/meeting-state.test.ts
// Or standard jest/vitest if installed later.

test('Meeting State Machine Transitions', async (t) => {
    
    await t.test('PENDING transitions', () => {
        assert.strictEqual(validateMeetingTransition(MeetingStatus.PENDING, MeetingStatus.CONFIRMED), true, 'PENDING -> CONFIRMED should be valid')
        assert.strictEqual(validateMeetingTransition(MeetingStatus.PENDING, MeetingStatus.REJECTED), true, 'PENDING -> REJECTED should be valid')
        assert.strictEqual(validateMeetingTransition(MeetingStatus.PENDING, MeetingStatus.CANCELLED), true, 'PENDING -> CANCELLED should be valid')
        
        // Invalid
        assert.strictEqual(validateMeetingTransition(MeetingStatus.PENDING, MeetingStatus.COMPLETED), false, 'PENDING -> COMPLETED should be invalid')
        assert.strictEqual(validateMeetingTransition(MeetingStatus.PENDING, 'UNKNOWN_STATUS'), false, 'PENDING -> UNKNOWN should be invalid')
    })
    
    await t.test('CONFIRMED transitions', () => {
        assert.strictEqual(validateMeetingTransition(MeetingStatus.CONFIRMED, MeetingStatus.CANCELLED), true, 'CONFIRMED -> CANCELLED should be valid')
        assert.strictEqual(validateMeetingTransition(MeetingStatus.CONFIRMED, MeetingStatus.COMPLETED), true, 'CONFIRMED -> COMPLETED should be valid')
        
        // Invalid
        assert.strictEqual(validateMeetingTransition(MeetingStatus.CONFIRMED, MeetingStatus.PENDING), false, 'CONFIRMED -> PENDING should be invalid')
        assert.strictEqual(validateMeetingTransition(MeetingStatus.CONFIRMED, MeetingStatus.REJECTED), false, 'CONFIRMED -> REJECTED should be invalid')
    })
    
    await t.test('Terminal states (REJECTED, CANCELLED, COMPLETED) should have no valid transitions', () => {
        const terminalStates = [MeetingStatus.REJECTED, MeetingStatus.CANCELLED, MeetingStatus.COMPLETED]
        const allStates = Object.values(MeetingStatus)
        
        for (const terminal of terminalStates) {
            for (const next of allStates) {
                assert.strictEqual(
                    validateMeetingTransition(terminal, next), 
                    false, 
                    `${terminal} -> ${next} should be invalid (terminal state)`
                )
            }
        }
    })

    await t.test('Invalid or unknown starting states should safely return false', () => {
        assert.strictEqual(validateMeetingTransition('INVALID_STATE', MeetingStatus.CONFIRMED), false, 'Should handle unknown start states securely')
        assert.strictEqual(validateMeetingTransition('', MeetingStatus.COMPLETED), false, 'Should handle empty start states securely')
        assert.strictEqual(validateMeetingTransition('PENDING', 'INVALID_NEXT'), false, 'Should handle unknown next states securely')
    })
    
    await t.test('canCancel helper', () => {
        assert.strictEqual(canCancel(MeetingStatus.PENDING), true, 'PENDING meetings can be cancelled')
        assert.strictEqual(canCancel(MeetingStatus.CONFIRMED), true, 'CONFIRMED meetings can be cancelled')
        
        assert.strictEqual(canCancel(MeetingStatus.REJECTED), false, 'REJECTED cannot be cancelled')
        assert.strictEqual(canCancel(MeetingStatus.CANCELLED), false, 'CANCELLED cannot be cancelled')
        assert.strictEqual(canCancel(MeetingStatus.COMPLETED), false, 'COMPLETED cannot be cancelled')
    })
})

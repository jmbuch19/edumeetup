import * as assert from 'node:assert'
import { test } from 'node:test'
import { isDisposableDomain, getUniversityInfo, refreshDomains } from '../university-domains'

// To run this: npx tsx lib/__tests__/university-domains.test.ts

test('isDisposableDomain Formatting and Checking', async (t) => {
    
    await t.test('Clean matches in hardcoded set', () => {
        assert.strictEqual(isDisposableDomain('gmail.com'), true)
        assert.strictEqual(isDisposableDomain('mailinator.com'), true)
    })

    await t.test('Mixed case handling (should be lowercased)', () => {
        assert.strictEqual(isDisposableDomain('GMAIL.COM'), true, 'Should handle all caps')
        assert.strictEqual(isDisposableDomain('Mailinator.Com'), true, 'Should handle PascalCase')
        assert.strictEqual(isDisposableDomain('gMaIl.cOm'), true, 'Should handle spongebob case')
    })

    await t.test('Whitespace handling (should be trimmed)', () => {
        assert.strictEqual(isDisposableDomain(' gmail.com'), true, 'Should trim leading space')
        assert.strictEqual(isDisposableDomain('gmail.com '), true, 'Should trim trailing space')
        assert.strictEqual(isDisposableDomain('   gmail.com   '), true, 'Should trim surrounding spaces')
    })

    await t.test('Combined case and whitespace handling', () => {
        assert.strictEqual(isDisposableDomain('   YahoO.CoM   '), true, 'Should correctly identify messy inputs')
    })

    await t.test('Safe rejections (Domains not in the blocklist)', () => {
        // Safe domains should not accidentally match
        assert.strictEqual(isDisposableDomain('harvard.edu'), false)
        assert.strictEqual(isDisposableDomain('ox.ac.uk'), false)
        
        // Edge case: substrings shouldn't match if the Set is doing an exact match
        assert.strictEqual(isDisposableDomain('mygmail.com'), false)
        assert.strictEqual(isDisposableDomain('gmail.com.org'), false)
    })
})

test('getUniversityInfo Domain Hierarchies', async (t) => {
    // Mock the network fetch for exact test determinism
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (url: string | URL | globalThis.Request) => {
        const urlStr = url.toString()
        if (urlStr.includes('disposable')) {
            return { ok: true, text: async () => 'mock-disposable.com\n' } as any
        }
        if (urlStr.includes('world_universities_and_domains.json')) {
            return { ok: true, json: async () => ([
                { name: "University of Oxford", country: "United Kingdom", alpha_two_code: "GB", domains: ["ox.ac.uk"] },
                { name: "Harvard University", country: "United States", alpha_two_code: "US", domains: ["harvard.edu"] },
                { name: "Australian National University", country: "Australia", alpha_two_code: "AU", domains: ["anu.edu.au"] },
            ])} as any
        }
        throw new Error('Unexpected URL: ' + urlStr)
    }

    try {
        await refreshDomains() // Ensure caches are populated with our mocked dataset

        await t.test('Exact Matches', () => {
            const ox = getUniversityInfo('ox.ac.uk')
            assert.ok(ox, 'Should find accurate exact match')
            assert.strictEqual(ox.name, 'University of Oxford', 'Should return full metadata')

            const anu = getUniversityInfo('anu.edu.au')
            assert.strictEqual(anu?.name, 'Australian National University')
        })

        await t.test('Subdomain Walk-up (Fallback resolution)', () => {
            // "cs.ox.ac.uk" isn't explicitly listed, but the fallback parser should slice it off
            // and recursively test up to two tiers.
            const csDepartment = getUniversityInfo('cs.ox.ac.uk')
            assert.ok(csDepartment, 'Should correctly roll up subdomains to parent')
            assert.strictEqual(csDepartment.name, 'University of Oxford')

            // Multiple tiers deep
            const deepMatch = getUniversityInfo('students.engineering.harvard.edu')
            assert.ok(deepMatch)
            assert.strictEqual(deepMatch.name, 'Harvard University')
        })

        await t.test('Safe rejections (Unrelated domains)', () => {
            // Completely fake universities shouldn't match
            assert.strictEqual(getUniversityInfo('fake-university.edu'), null)
            
            // Generic subdomains mapped onto unrelated TLDs shouldn't accidentally match
            assert.strictEqual(getUniversityInfo('ox.ac.uk.org'), null)
        })

        await t.test('Manual allowlist overrides', () => {
            // Check hardcoded MANUAL_DOMAIN_ALLOWLIST fallback functionality
            const iaes = getUniversityInfo('iaesgujarat.org')
            assert.ok(iaes, 'Should respect hardcoded fallback mapping')
            assert.strictEqual(iaes.name, 'IAES Gujarat')
        })

    } finally {
        globalThis.fetch = originalFetch
    }
})

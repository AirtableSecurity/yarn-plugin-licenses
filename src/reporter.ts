import { Writable } from 'stream'

import junitBuilder from 'junit-report-builder'

import { LICENSE_FAILURE_TYPE, LicenseResults, Result } from './types'
import { printTable, ResultMap } from './utils'

const PRINTABLE_REASON: { [k in LICENSE_FAILURE_TYPE]: string } = {
    missing: 'License could not be found.',
    incompatible: 'License is incompatible.',
}

export async function buildJUnitReport({
    results,
    outputFile,
    stdout,
}: {
    results: LicenseResults
    outputFile?: string
    stdout: Writable
}): Promise<void> {
    if (!outputFile) return

    const suite = junitBuilder.testSuite().name('Dependency Licenses Audit')
    for (const [name, result] of [
        ...results.pass.entries(),
        ...results.fail.entries(),
        ...results.ignored.entries(),
    ].sort()) {
        const testCase = suite.testCase().name(name)
        if (results.ignored.has(name)) {
            testCase.skipped()
        } else if (result.reason) {
            testCase.failure(
                `License: ${result.license}. Reason: ${
                    PRINTABLE_REASON[result.reason]
                }`,
                result.reason,
            )
        }
    }

    if (outputFile === '-') {
        stdout.write(`${junitBuilder.build()}\n`)
    } else {
        junitBuilder.writeTo(outputFile)
    }
}

export async function printSummary({
    results,
    stdout,
    configFilename,
}: {
    results: LicenseResults
    stdout: Writable
    configFilename?: string
}): Promise<void> {
    printPasses(results.pass, stdout);
    stdout.write('\n');
    printFailures(results.fail, stdout);
}

function printPasses(pass: ResultMap<string, Result>, stdout: Writable) {
    const table = [['Package', 'License', 'Reason', 'Repository']];
    const summaryResults = [
        ...pass.entries(),
    ].map(([name, result]) => [
        name,
        String(result.license || '?'),
        String('pass'),
        String(result.repository || '?'),
    ]);
    table.push(...summaryResults);
    printTable(table, stdout);
}

function printFailures(fail: ResultMap<string, Result>, stdout: Writable) {
    const table = [['Package', 'License', 'Reason', 'Repository']]
    const summaryResults = [
        ...fail.entries(),
    ].map(([name, result]) => [
        name,
        String(result.license || '?'),
        String(result.reason || '?'),
        String(result.repository || '?'),
    ])
    table.push(...summaryResults)
    printTable(table, stdout)
}
import * as assert from 'assert';
import * as vscode from 'vscode';
import { getConfiguration, setConfiguration, resetConfiguration } from '../../src/config';

suite('Config Test Suite', () => {
    let originalGetConfiguration: any;

    setup(() => {
        originalGetConfiguration = vscode.workspace.getConfiguration;
        // Mock vscode.workspace.getConfiguration
        vscode.workspace.getConfiguration = (section?: string) => {
            if (section === 'contextualConsoleLog') {
                return {
                    get: (key: string, defaultValue: any) => {
                        switch (key) {
                            case 'logTemplate': return '[${fileName}]';
                            case 'logLevel': return 'debug';
                            case 'logItems': return ['locals'];
                            case 'addDebugger': return true;
                            case 'logFunction': return 'console';
                            case 'enableClassMethodLogging': return false;
                            case 'enableHookLogging': return false;                            case 'logTag': return '// LOG';
                            case 'wrapInDevCheck': return true;                            case 'showPreview': return false;                            case 'enableTelemetry': return false;                            case 'enableContextLogging': return false;                            case 'enableReduxContextLogging': return false;                            case 'customLoggerImportStatement': return '';                            case 'sensitiveKeys': return ['secret'];                            case 'ignore': return [];                            case 'filterUnusedVariables': return false;                            case 'enableDuplicatePrevention': return false;                            default: return defaultValue;                        }
                    }
                } as any;            }
            return originalGetConfiguration(section);        };
    });

    teardown(() => {
        vscode.workspace.getConfiguration = originalGetConfiguration;
        resetConfiguration();
    });

    test('getConfiguration should return default values', () => {
        const config = getConfiguration();
        assert.strictEqual(config.logTemplate, '[${fileName}]');
        assert.strictEqual(config.logLevel, 'debug');
        assert.deepStrictEqual(config.logItems, ['locals']);
        assert.strictEqual(config.addDebugger, true);
        assert.strictEqual(config.logFunction, 'console');
        assert.strictEqual(config.enableClassMethodLogging, false);
        assert.strictEqual(config.enableHookLogging, false);
        assert.strictEqual(config.logTag, '// LOG');
        assert.strictEqual(config.wrapInDevCheck, true);
        assert.strictEqual(config.showPreview, false);
        assert.strictEqual(config.enableTelemetry, false);
        assert.strictEqual(config.enableContextLogging, false);
        assert.strictEqual(config.enableReduxContextLogging, false);
        assert.strictEqual(config.customLoggerImportStatement, '');
        assert.deepStrictEqual(config.sensitiveKeys, ['secret']);
        assert.deepStrictEqual(config.ignore, []);
        assert.strictEqual(config.filterUnusedVariables, false);
        assert.strictEqual(config.enableDuplicatePrevention, false);
    });

    test('setConfiguration should override values', () => {
        setConfiguration(() => ({
            logTemplate: 'CUSTOM_TEMPLATE',
            logLevel: 'info',
            logItems: ['props'],
            addDebugger: false,
            logFunction: 'myLogger',
            enableClassMethodLogging: true,
            enableHookLogging: true,
            logTag: '// CUSTOM_TAG',
            wrapInDevCheck: false,
            showPreview: true,
            enableTelemetry: true,
            enableContextLogging: true,
            enableReduxContextLogging: true,
            customLoggerImportStatement: 'import { custom } from \'custom\';',
            sensitiveKeys: ['key'],
            ignore: ['*.log'],
            filterUnusedVariables: true,
            enableDuplicatePrevention: true,
        }));

        const config = getConfiguration();
        assert.strictEqual(config.logTemplate, 'CUSTOM_TEMPLATE');
        assert.strictEqual(config.logLevel, 'info');
        assert.deepStrictEqual(config.logItems, ['props']);
        assert.strictEqual(config.addDebugger, false);
        assert.strictEqual(config.logFunction, 'myLogger');
        assert.strictEqual(config.enableClassMethodLogging, true);
        assert.strictEqual(config.enableHookLogging, true);
        assert.strictEqual(config.logTag, '// CUSTOM_TAG');
        assert.strictEqual(config.wrapInDevCheck, false);
        assert.strictEqual(config.showPreview, true);
        assert.strictEqual(config.enableTelemetry, true);
        assert.strictEqual(config.enableContextLogging, true);
        assert.strictEqual(config.enableReduxContextLogging, true);
        assert.strictEqual(config.customLoggerImportStatement, 'import { custom } from \'custom\';');
        assert.deepStrictEqual(config.sensitiveKeys, ['key']);
        assert.deepStrictEqual(config.ignore, ['*.log']);
        assert.strictEqual(config.filterUnusedVariables, true);
        assert.strictEqual(config.enableDuplicatePrevention, true);
    });

    test('resetConfiguration should restore default values', () => {
        setConfiguration(() => ({
            logTemplate: 'TEMP',
            logLevel: 'TEMP',
            logItems: [],
            addDebugger: false,
            logFunction: 'TEMP',
            enableClassMethodLogging: false,
            enableHookLogging: false,
            logTag: 'TEMP',
            wrapInDevCheck: false,
            showPreview: false,
            enableTelemetry: false,
            enableContextLogging: false,
            enableReduxContextLogging: false,
            customLoggerImportStatement: 'TEMP',
            sensitiveKeys: [],
            ignore: [],
            filterUnusedVariables: false,
            enableDuplicatePrevention: false,
        }));

        resetConfiguration();
        const config = getConfiguration();
        assert.strictEqual(config.logTemplate, '[${fileName}]');
        assert.strictEqual(config.logLevel, 'debug');
        assert.deepStrictEqual(config.logItems, ['locals']);
    });
});

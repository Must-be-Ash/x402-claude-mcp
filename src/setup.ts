#!/usr/bin/env node

import { createInterface } from 'readline';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SetupConfig {
  privateKey: string;
  useExample: boolean;
  customEndpoints?: any[];
}

/**
 * Interactive setup wizard for x402-claude-mcp
 */
export async function runSetup(): Promise<void> {
  console.log('\n🚀 Welcome to x402-claude-mcp Setup!\n');
  console.log('This wizard will help you configure your MCP server.\n');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve);
    });
  };

  try {
    // Step 1: Create config directory
    console.log('📁 Setting up configuration directory...');
    const configDir = join(homedir(), '.x402-claude-mcp');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
      console.log(`✅ Created directory: ${configDir}\n`);
    } else {
      console.log(`✅ Directory already exists: ${configDir}\n`);
    }

    // Step 2: Get private key
    console.log('🔑 Wallet Configuration');
    console.log('You need a CDP (Coinbase Developer Platform) wallet private key.');
    console.log('This will be stored in Claude Desktop\'s config, NOT in the endpoints.json file.\n');

    const privateKey = await question('Enter your wallet private key (starts with 0x): ');

    if (!privateKey.startsWith('0x')) {
      console.log('\n❌ Error: Private key must start with "0x"');
      rl.close();
      process.exit(1);
    }

    // Step 3: Choose endpoints
    console.log('\n📋 Endpoint Configuration');
    console.log('The example configuration includes several pre-configured x402 endpoints:');
    console.log('  • QR Code Generator ($0.01)');
    console.log('  • URL Metadata Extractor ($0.01)');
    console.log('  • Polymarket Events API ($0.01)');
    console.log('  • AI GIF Search ($0.05)');
    console.log('  • AI Video Generation ($0.20)');
    console.log('  • And more...\n');

    const useExample = await question('Use example endpoints? (yes/no) [yes]: ');
    const shouldUseExample = !useExample.trim() || useExample.toLowerCase().startsWith('y');

    // Step 4: Create endpoints.json
    const configPath = join(configDir, 'endpoints.json');
    let config: any;

    if (shouldUseExample) {
      // Copy example config
      const examplePath = join(__dirname, '../config/endpoints.example.json');
      const exampleConfig = JSON.parse(readFileSync(examplePath, 'utf-8'));
      config = exampleConfig;
      console.log('✅ Using example endpoints configuration\n');
    } else {
      // Minimal config
      config = {
        wallet: {
          provider: 'cdp-embedded',
          network: 'base',
          privateKey: '${PRIVATE_KEY}',
        },
        endpoints: [],
      };
      console.log('✅ Created minimal configuration\n');
      console.log('💡 You can add endpoints later by editing: ' + configPath + '\n');
    }

    // Always use ${PRIVATE_KEY} placeholder in the config file
    config.wallet.privateKey = '${PRIVATE_KEY}';

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Created configuration file: ${configPath}\n`);

    // Step 5: Update Claude Desktop config
    console.log('🖥️  Claude Desktop Configuration');
    const claudeConfigPath = join(homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');

    let updateClaudeConfig = true;
    if (existsSync(claudeConfigPath)) {
      const update = await question('Update Claude Desktop config? (yes/no) [yes]: ');
      updateClaudeConfig = !update.trim() || update.toLowerCase().startsWith('y');
    } else {
      console.log('Creating new Claude Desktop config file...');
    }

    if (updateClaudeConfig) {
      let claudeConfig: any = { mcpServers: {} };

      if (existsSync(claudeConfigPath)) {
        try {
          claudeConfig = JSON.parse(readFileSync(claudeConfigPath, 'utf-8'));
          if (!claudeConfig.mcpServers) {
            claudeConfig.mcpServers = {};
          }
        } catch (error) {
          console.log('⚠️  Warning: Could not parse existing Claude config, creating new one');
        }
      } else {
        // Ensure the directory exists
        const claudeConfigDir = dirname(claudeConfigPath);
        if (!existsSync(claudeConfigDir)) {
          mkdirSync(claudeConfigDir, { recursive: true });
        }
      }

      // Add or update x402-claude-mcp server config
      claudeConfig.mcpServers['x402-claude-mcp'] = {
        command: 'npx',
        args: ['-y', 'x402-claude-mcp'],
        env: {
          PRIVATE_KEY: privateKey,
          X402_CONFIG_PATH: configPath,
        },
      };

      writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
      console.log(`✅ Updated Claude Desktop config: ${claudeConfigPath}\n`);
    }

    // Step 6: Success message
    console.log('\n🎉 Setup Complete!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Your Claude Desktop now has a wallet! 💰\n');
    console.log('Next Steps:');
    console.log('1. Restart Claude Desktop to activate the MCP server');
    console.log('2. Look for the 🔌 icon in Claude Desktop to verify the server is running');
    console.log('3. Try asking Claude to use one of your configured endpoints!\n');
    console.log('Configuration Files:');
    console.log(`  • Endpoints: ${configPath}`);
    console.log(`  • Claude Desktop: ${claudeConfigPath}\n`);
    console.log('Example Usage:');
    console.log('  "Generate a QR code for https://example.com"');
    console.log('  "Extract metadata from https://github.com"\n');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSetup();
}

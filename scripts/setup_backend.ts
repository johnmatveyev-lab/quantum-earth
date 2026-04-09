import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

async function main() {
    console.log('🚀 Initiating SKYWATCH Backend Auto-Setup...');

    const envPath = resolve(process.cwd(), '.env');
    let envContent = readFileSync(envPath, 'utf-8');

    // --- 1. STRIPE SETUP ---
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey && stripeKey.startsWith('sk' + '_test_')) {
        console.log('\n📦 Configuring Stripe Products & Prices...');
        const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });

        // Pro Tier
        const proProduct = await stripe.products.create({
            name: 'Pro Datalink',
            description: 'Advanced tactical tracking & AI agent analysis',
        });
        const proPrice = await stripe.prices.create({
            product: proProduct.id,
            unit_amount: 2900, // $29.00
            currency: 'usd',
            recurring: { interval: 'month' },
        });
        console.log(`✅ Created Pro Tier (Price ID: ${proPrice.id})`);

        // Enterprise Tier
        const entProduct = await stripe.products.create({
            name: 'Enterprise Array',
            description: 'Unlimited multi-domain sensor integration',
        });
        const entPrice = await stripe.prices.create({
            product: entProduct.id,
            unit_amount: 19900, // $199.00
            currency: 'usd',
            recurring: { interval: 'month' },
        });
        console.log(`✅ Created Enterprise Tier (Price ID: ${entPrice.id})`);

        // Update .env
        envContent = envContent.replace(
            /STRIPE_PRO_PRICE_ID=".*"/,
            `STRIPE_PRO_PRICE_ID="${proPrice.id}"`
        );
        envContent = envContent.replace(
            /STRIPE_ENTERPRISE_PRICE_ID=".*"/,
            `STRIPE_ENTERPRISE_PRICE_ID="${entPrice.id}"`
        );
        writeFileSync(envPath, envContent);
        console.log('✅ Updated .env with Stripe Price IDs');
    }

    // --- 2. SUPABASE TEST USER SETUP ---
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey && serviceRoleKey.startsWith('eyJ')) {
        console.log('\n👤 Provisioning Pre-Verified Test User...');
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        const email = 'commander@orbital.local';
        const password = 'Command123!';

        // Check if user exists
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = users?.users.find((u) => u.email === email);

        if (existingUser) {
            console.log('✅ Default test user already exists');
        } else {
            const { error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: 'Fleet Commander' },
            });

            if (error) {
                console.error('❌ Failed to create user:', error.message);
            } else {
                console.log('✅ Created pre-verified test user successfully!');
            }
        }

        console.log('\n=======================================');
        console.log('  YOU CAN NOW LOGIN TO THE PREVIEW!  ');
        console.log('  Email:    ' + email);
        console.log('  Password: ' + password);
        console.log('=======================================\n');
    } else {
        console.log('\n⚠ Skipping user setup: SUPABASE_SERVICE_ROLE_KEY missing or invalid');
    }
}

main().catch(console.error);

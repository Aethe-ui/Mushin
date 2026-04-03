require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg(connectionString);
const prisma = new PrismaClient({ adapter });

function parseInput() {
    const raw = process.argv[2];
    if (!raw) {
        throw new Error('Missing JSON input argument');
    }
    return JSON.parse(raw);
}

function normalizeDateOnly(value) {
    const parsed = value ? new Date(value) : new Date();
    const iso = new Date(parsed.getTime() - (parsed.getTimezoneOffset() * 60000)).toISOString();
    return new Date(iso.slice(0, 10));
}

async function fetchLastThreeDays(userId) {
    const rows = await prisma.dailyMetric.findMany({
        where: { userId },
        orderBy: { entryDate: 'desc' },
        take: 3,
        select: {
            focusHours: true,
            restHours: true
        }
    });

    return rows
        .reverse()
        .map((row) => ({
            focus_hours: Number(row.focusHours),
            rest_hours: Number(row.restHours)
        }));
}

async function storeDay(payload) {
    const userId = String(payload.user_id || 'demo-user').trim() || 'demo-user';
    const entryDate = normalizeDateOnly(payload.entry_date);

    const existing = await prisma.dailyMetric.findFirst({
        where: { userId, entryDate }
    });

    const data = {
        userId,
        entryDate,
        focusHours: Number(payload.focus_hours || 0),
        workoutMinutes: Number(payload.workout_minutes || 0),
        restHours: Number(payload.rest_hours || 0),
        score: Number(payload.score || 0),
        xp: Number(payload.xp || 0),
        state: String(payload.state || 'NORMAL'),
        explanation: String(payload.explanation || '')
    };

    if (existing) {
        await prisma.dailyMetric.update({
            where: { id: existing.id },
            data
        });
    } else {
        await prisma.dailyMetric.create({ data });
    }

    return { ok: true };
}

async function main() {
    const input = parseInput();
    const action = input.action;

    if (action === 'fetch_last_three_days') {
        const userId = String(input.user_id || 'demo-user').trim() || 'demo-user';
        const history = await fetchLastThreeDays(userId);
        console.log(JSON.stringify(history));
        return;
    }

    if (action === 'store_day') {
        const result = await storeDay(input);
        console.log(JSON.stringify(result));
        return;
    }

    throw new Error(`Unsupported action: ${action}`);
}

main()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

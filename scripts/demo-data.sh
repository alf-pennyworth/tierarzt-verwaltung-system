#!/bin/bash
# Demo Data Preparation Script
# Seeds test data for Saturday demo
# Run this before starting the demo

set -e

echo "🩺 Vet App Demo Data Preparation"
echo "================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
command -v curl >/dev/null 2>&1 || { echo -e "${RED}❌ curl not found${NC}"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo -e "${YELLOW}⚠️  jq not found, some output may be raw${NC}"; }

# Supabase configuration
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"

# Demo configuration
DEMO_EMAIL="demo@tierarzt-app.de"
DEMO_PASSWORD="demo123456"
DEMO_PRACTICE_NAME="Tierarztpraxis Demo"

echo -e "${YELLOW}Note:${NC} Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables for remote DB"
echo ""

# Function to make authenticated requests
api_call() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local auth_token="$4"
    
    local args=(-X "$method" "$SUPABASE_URL/rest/v1/$endpoint" -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json")
    
    if [ -n "$auth_token" ]; then
        args+=(-H "Authorization: Bearer $auth_token")
    fi
    
    if [ -n "$data" ]; then
        args+=(-d "$data")
    fi
    
    curl -s "${args[@]}"
}

echo "📋 Step 1: Checking existing data..."
echo ""

# Check if practice exists
PRACTICE_COUNT=$(curl -s "$SUPABASE_URL/rest/v1/praxis?select=count" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Prefer: count=exact" | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

echo -e "Found $PRACTICE_COUNT practices"

if [ "$PRACTICE_COUNT" -eq 0 ]; then
    echo ""
    echo "🏥 Step 2: Creating demo practice..."
    
    PRACTICE_DATA='{
        "name": "'"$DEMO_PRACTICE_NAME"'",
        "address": "Demoplatz 1",
        "city": "Berlin",
        "postal_code": "10115",
        "phone": "+49 30 123456789",
        "email": "info@tierarztpraxis-demo.de",
        "bnr15": "DE000123456789"
    }'
    
    PRACTICE_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/praxis" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=representation" \
        -d "$PRACTICE_DATA")
    
    PRACTICE_ID=$(echo "$PRACTICE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | grep -o '[a-f0-9-]\{36\}')
    echo -e "${GREEN}✓${NC} Created practice: $DEMO_PRACTICE_NAME (ID: $PRACTICE_ID)"
else
    # Get first practice ID
    PRACTICE_ID=$(curl -s "$SUPABASE_URL/rest/v1/praxis?select=id&limit=1" \
        -H "apikey: $SUPABASE_ANON_KEY" | grep -o '[a-f0-9-]\{36\}' | head -1)
    echo -e "${GREEN}✓${NC} Using existing practice: $PRACTICE_ID"
fi

echo ""
echo "👥 Step 3: Creating demo users..."
echo ""

# Create demo vet user (via Supabase Auth)
# Note: This requires service role key for auth.admin.createUser
# For demo purposes, we'll assume manual signup via UI or existing user

echo -e "${YELLOW}⚠️  Manual step required:${NC}"
echo "   1. Go to $SUPABASE_URL/auth/v1/verify"
echo "   2. Or sign up via the app UI with:"
echo "      Email: $DEMO_EMAIL"
echo "      Password: $DEMO_PASSWORD"
echo ""

# For now, we'll create placeholder instructions
echo -e "${YELLOW}Assuming demo user already exists or will be created via UI...${NC}"
echo ""

echo "🐕 Step 4: Seeding demo patients..."
echo ""

# Check existing patients
PATIENT_COUNT=$(curl -s "$SUPABASE_URL/rest/v1/patient?select=count&praxis_id=eq.$PRACTICE_ID" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Prefer: count=exact" | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$PATIENT_COUNT" -lt 5 ]; then
    # Create demo patients
    PATIENTS='[
        {"praxis_id": "'"$PRACTICE_ID"'", "name": "Bello", "species": "Hund", "breed": "Schäferhund", "gender": "männlich", "birth_date": "2020-03-15", "owner_name": "Max Mustermann", "owner_phone": "+49 30 111222333"},
        {"praxis_id": "'"$PRACTICE_ID"'", "name": "Mimi", "species": "Katze", "breed": "Europäisch Kurzhaar", "gender": "weiblich", "birth_date": "2022-07-20", "owner_name": "Anna Schmidt", "owner_phone": "+49 30 222333444"},
        {"praxis_id": "'"$PRACTICE_ID"'", "name": "Rex", "species": "Hund", "breed": "Labrador", "gender": "männlich", "birth_date": "2019-05-10", "owner_name": "Peter Wagner", "owner_phone": "+49 30 333444555"},
        {"praxis_id": "'"$PRACTICE_ID"'", "name": "Luna", "species": "Katze", "breed": "Perser", "gender": "weiblich", "birth_date": "2021-11-08", "owner_name": "Julia Müller", "owner_phone": "+49 30 444555666"},
        {"praxis_id": "'"$PRACTICE_ID"'", "name": "Charly", "species": "Hund", "breed": "Golden Retriever", "gender": "männlich", "birth_date": "2018-09-22", "owner_name": "Thomas Berger", "owner_phone": "+49 30 555666777"}
    ]'
    
    curl -s -X POST "$SUPABASE_URL/rest/v1/patient" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$PATIENTS" > /dev/null
    
    echo -e "${GREEN}✓${NC} Created 5 demo patients"
else
    echo -e "${GREEN}✓${NC} Patients already exist ($PATIENT_COUNT found)"
fi

echo ""
echo "💊 Step 5: Verifying antibiotics..."
echo ""

# Check antibiotics count
ANTIBIOTICS_COUNT=$(curl -s "$SUPABASE_URL/rest/v1/antibiotics?select=count" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Prefer: count=exact" | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$ANTIBIOTICS_COUNT" -lt 40 ]; then
    echo -e "${YELLOW}⚠️  Only $ANTIBIOTICS_COUNT antibiotics found. Run migrations to seed full list:${NC}"
    echo "   supabase db push"
    echo "   or"
    echo "   psql -f supabase/migrations/20260412_seed_antibiotics.sql"
else
    echo -e "${GREEN}✓${NC} Found $ANTIBIOTICS_COUNT antibiotics"
fi

echo ""
echo "📋 Step 6: Creating demo prescriptions..."
echo ""

# Get patient IDs for prescriptions
FIRST_PATIENT_ID=$(curl -s "$SUPABASE_URL/rest/v1/patient?select=id&praxis_id=eq.$PRACTICE_ID&limit=1" \
    -H "apikey: $SUPABASE_ANON_KEY" | grep -o '[a-f0-9-]\{36\}' | head -1)

# Create sample prescriptions if needed
PRESCRIPTION_COUNT=$(curl -s "$SUPABASE_URL/rest/v1/antibiotic_prescriptions?select=count&praxis_id=eq.$PRACTICE_ID" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Prefer: count=exact" | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$PRESCRIPTION_COUNT" -lt 3 ]; then
    # Calculate dates for demo
    TODAY=$(date +%Y-%m-%d)
    WEEK_AGO=$(date -d '7 days ago' +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d)
    MONTH_AGO=$(date -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d)
    
    PRESCRIPTIONS='[
        {
            "praxis_id": "'"$PRACTICE_ID"'",
            "drug_name": "Amoxicillin 500mg",
            "active_substance": "Amoxicillin",
            "antibiotic_class": "penicillins",
            "amount_prescribed": 14,
            "unit": "Tabletten",
            "animal_species": "dogs",
            "animal_count": 1,
            "treatment_duration_days": 7,
            "route_of_administration": "oral",
            "diagnosis": "Hautinfektion",
            "prescription_type": "therapeutic",
            "prescription_date": "'"$WEEK_AGO"'"
        },
        {
            "praxis_id": "'"$PRACTICE_ID"'",
            "drug_name": "Enrofloxacin 10%",
            "active_substance": "Enrofloxacin",
            "antibiotic_class": "fluoroquinolones",
            "amount_prescribed": 50,
            "unit": "ml",
            "animal_species": "cats",
            "animal_count": 1,
            "treatment_duration_days": 5,
            "route_of_administration": "subcutaneous",
            "diagnosis": "Atemwegsinfektion",
            "prescription_type": "therapeutic",
            "prescription_date": "'"$MONTH_AGO"'"
        },
        {
            "praxis_id": "'"$PRACTICE_ID"'",
            "drug_name": "Doxycyclin 200mg",
            "active_substance": "Doxycyclin",
            "antibiotic_class": "tetracyclines",
            "amount_prescribed": 10,
            "unit": "Tabletten",
            "animal_species": "dogs",
            "animal_count": 1,
            "treatment_duration_days": 10,
            "route_of_administration": "oral",
            "diagnosis": "Borreliose",
            "prescription_type": "therapeutic",
            "prescription_date": "'"$TODAY"'"
        }
    ]'
    
    curl -s -X POST "$SUPABASE_URL/rest/v1/antibiotic_prescriptions" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "$PRESCRIPTIONS" > /dev/null
    
    echo -e "${GREEN}✓${NC} Created 3 demo prescriptions"
else
    echo -e "${GREEN}✓${NC} Prescriptions already exist ($PRESCRIPTION_COUNT found)"
fi

echo ""
echo "================================="
echo -e "${GREEN}✅ Demo data preparation complete!${NC}"
echo ""
echo "📊 Summary:"
echo "   Practice:    $DEMO_PRACTICE_NAME"
echo "   Patients:     5"
echo "   Antibiotics:  $ANTIBIOTICS_COUNT"
echo "   Prescriptions: 3"
echo ""
echo "🔐 Demo Credentials:"
echo "   Email:    $DEMO_EMAIL"
echo "   Password: $DEMO_PASSWORD"
echo ""
echo "🚀 Next steps:"
echo "   1. Start API: cd api && bun run src/index.ts"
echo "   2. Start frontend: bun run dev"
echo "   3. Login with demo credentials"
echo "   4. Navigate to TAMG module"
echo ""
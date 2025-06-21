#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

# Base URL
API_URL="http://localhost:3001"

echo -e "${BLUE}Starting API Tests...${NC}\n"

# Test 1: Create disaster with exact address
echo -e "${BLUE}Test 1: Create disaster with exact address${NC}"
curl -X POST "${API_URL}/disasters" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Building Fire",
    "description": "Major fire at 350 5th Avenue, New York, NY (Empire State Building). Multiple fire trucks responding.",
    "tags": ["fire", "emergency"],
    "owner_id": "testUser1"
  }'
echo -e "\n\n"

# Test 2: Create disaster with landmark
echo -e "${BLUE}Test 2: Create disaster with landmark${NC}"
curl -X POST "${API_URL}/disasters" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Protest Alert",
    "description": "Large protest gathering near the Eiffel Tower in Paris, France. Traffic disruptions expected.",
    "tags": ["civil_unrest", "crowd"],
    "owner_id": "testUser2"
  }'
echo -e "\n\n"

# Test 3: Create disaster with neighborhood
echo -e "${BLUE}Test 3: Create disaster with neighborhood${NC}"
curl -X POST "${API_URL}/disasters" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Flash Flooding",
    "description": "Severe flash flooding in Brooklyn Heights, Brooklyn. Multiple streets affected.",
    "tags": ["flood", "emergency"],
    "owner_id": "testUser3"
  }'
echo -e "\n\n"

# Test 4: Create disaster with multiple locations (should pick primary)
echo -e "${BLUE}Test 4: Create disaster with multiple locations${NC}"
curl -X POST "${API_URL}/disasters" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Earthquake Impact",
    "description": "6.2 magnitude earthquake in Tokyo, Japan. Aftershocks felt in Yokohama and Kawasaki.",
    "tags": ["earthquake", "emergency"],
    "owner_id": "testUser4"
  }'
echo -e "\n\n"

# Test 5: Create disaster with intersection
echo -e "${BLUE}Test 5: Create disaster with intersection${NC}"
curl -X POST "${API_URL}/disasters" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Traffic Accident",
    "description": "Major pile-up at the intersection of Hollywood and Vine in Los Angeles, CA.",
    "tags": ["accident", "traffic"],
    "owner_id": "testUser5"
  }'
echo -e "\n\n"

# Test 6: Create disaster with region/area
echo -e "${BLUE}Test 6: Create disaster with region/area${NC}"
curl -X POST "${API_URL}/disasters" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Forest Fire Warning",
    "description": "Uncontrolled forest fire spreading in Northern California, particularly in Mendocino National Forest.",
    "tags": ["fire", "wildfire", "evacuation"],
    "owner_id": "testUser6"
  }'
echo -e "\n\n"

# Test 7: Create disaster with postal code
echo -e "${BLUE}Test 7: Create disaster with postal code${NC}"
curl -X POST "${API_URL}/disasters" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Gas Leak",
    "description": "Dangerous gas leak reported in London postal code SW1A 1AA. Area being evacuated.",
    "tags": ["hazmat", "evacuation"],
    "owner_id": "testUser7"
  }'
echo -e "\n\n"

# Test 8: Create disaster with colloquial place name
echo -e "${BLUE}Test 8: Create disaster with colloquial place name${NC}"
curl -X POST "${API_URL}/disasters" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Power Outage",
    "description": "Widespread power outage affecting the entire Silicon Valley area.",
    "tags": ["power_outage", "infrastructure"],
    "owner_id": "testUser8"
  }'
echo -e "\n\n"

# Test 9: Create disaster with vague location
echo -e "${BLUE}Test 9: Create disaster with vague location${NC}"
curl -X POST "${API_URL}/disasters" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Storm Warning",
    "description": "Severe thunderstorm approaching the downtown area.",
    "tags": ["weather", "storm"],
    "owner_id": "testUser9"
  }'
echo -e "\n\n"

# Test 10: Get all disasters
echo -e "${BLUE}Test 10: Get all disasters${NC}"
curl "${API_URL}/disasters"
echo -e "\n\n"

# Test 11: Get disasters filtered by tag
echo -e "${BLUE}Test 11: Get disasters filtered by emergency tag${NC}"
curl "${API_URL}/disasters?tag=emergency"
echo -e "\n\n"

# Test Resource API
echo "Testing Resource API..."

# Create a test resource
echo -e "\nCreating test resource..."
RESOURCE_RESPONSE=$(curl -s -X POST "${API_URL}/api/resources" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Emergency Shelter",
    "type": "shelter",
    "location_name": "Downtown Community Center",
    "latitude": 37.7881,
    "longitude": -122.4075,
    "status": "active"
  }')

echo "Resource creation response: $RESOURCE_RESPONSE"

# Test nearby resources
echo -e "\nTesting nearby resources..."
NEARBY_RESPONSE=$(curl -s "${API_URL}/api/resources/nearby?latitude=37.7881&longitude=-122.4075&radius=1000")

echo "Nearby resources response: $NEARBY_RESPONSE"

# Count resources found
RESOURCE_COUNT=$(echo $NEARBY_RESPONSE | grep -o "id" | wc -l)
echo -e "\nFound $RESOURCE_COUNT resources nearby"

if [ $RESOURCE_COUNT -gt 0 ]; then
  echo -e "${GREEN}✓ Resources found successfully${NC}"
else
  echo -e "${RED}✗ No resources found${NC}"
fi 
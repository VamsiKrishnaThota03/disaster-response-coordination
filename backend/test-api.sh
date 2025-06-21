#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

# Base URL for the API
BASE_URL="http://localhost:3001/api"

# Function to make API calls and check responses
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5

    echo -e "\n🔍 Testing: $description"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -X $method "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=${response: -3}
    body=${response:0:${#response}-3}

    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ Success: $description${NC}"
        echo "Response: $body"
    else
        echo -e "${RED}✗ Failed: $description${NC}"
        echo "Expected status: $expected_status, got: $http_code"
        echo "Response: $body"
        exit 1
    fi
}

echo "🚀 Starting API Tests..."

# Test Disaster Endpoints
echo -e "\n📋 Testing Disaster Endpoints"

# Create a disaster
DISASTER_DATA='{
    "title": "Test Flood",
    "description": "Severe flooding in Miami Beach, Florida",
    "type": "flood",
    "severity": "high",
    "tags": ["flood", "emergency"]
}'
test_endpoint "POST" "/disasters" "$DISASTER_DATA" "201" "Create new disaster"

# Get all disasters
test_endpoint "GET" "/disasters" "" "200" "Get all disasters"

# Get disasters by tag
test_endpoint "GET" "/disasters?tag=flood" "" "200" "Get disasters by tag"

# Get the first disaster ID for further tests
DISASTER_ID=$(curl -s "$BASE_URL/disasters" | jq -r '.[0].id')

# Get specific disaster
test_endpoint "GET" "/disasters/$DISASTER_ID" "" "200" "Get specific disaster"

# Update disaster
UPDATE_DATA='{
    "title": "Updated Test Flood",
    "severity": "medium"
}'
test_endpoint "PUT" "/disasters/$DISASTER_ID" "$UPDATE_DATA" "200" "Update disaster"

# Test Resource Endpoints
echo -e "\n📍 Testing Resource Endpoints"

# Create a resource
RESOURCE_DATA='{
    "name": "Emergency Shelter",
    "type": "shelter",
    "location_name": "Miami Beach Community Center",
    "location": "POINT(-80.1300 25.7617)",
    "status": "active"
}'
test_endpoint "POST" "/disasters/$DISASTER_ID/resources" "$RESOURCE_DATA" "201" "Create new resource"

# Get nearby resources
test_endpoint "GET" "/disasters/$DISASTER_ID/resources?radius=5000" "" "200" "Get nearby resources"

# Test Report Endpoints
echo -e "\n📝 Testing Report Endpoints"

# Create a report
REPORT_DATA='{
    "content": "Water levels rising rapidly",
    "image_url": "https://example.com/flood.jpg"
}'
test_endpoint "POST" "/disasters/$DISASTER_ID/reports" "$REPORT_DATA" "201" "Create new report"

# Get reports for disaster
test_endpoint "GET" "/disasters/$DISASTER_ID/reports" "" "200" "Get disaster reports"

# Test Social Media Endpoints
echo -e "\n📱 Testing Social Media Endpoints"

# Get social media updates
test_endpoint "GET" "/disasters/$DISASTER_ID/social-media" "" "200" "Get social media updates"

# Test Image Verification
echo -e "\n🖼️ Testing Image Verification"

# Verify image
IMAGE_DATA='{
    "image_url": "https://example.com/flood.jpg"
}'
test_endpoint "POST" "/disasters/$DISASTER_ID/verify-image" "$IMAGE_DATA" "200" "Verify image"

# Test Official Updates
echo -e "\n📢 Testing Official Updates"

# Get official updates
test_endpoint "GET" "/disasters/$DISASTER_ID/official-updates" "" "200" "Get official updates"

# Cleanup
echo -e "\n🧹 Cleaning up test data"

# Delete the test disaster
test_endpoint "DELETE" "/disasters/$DISASTER_ID" "" "200" "Delete disaster"

echo -e "\n✅ All tests completed successfully!" 
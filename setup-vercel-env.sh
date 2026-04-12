#!/bin/bash
# Adds all Houspire Staging env vars to Vercel
# Run: bash setup-vercel-env.sh

echo "Adding environment variables to Vercel..."

echo "https://mehzdonrcbsxkpoehkuk.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production --force 2>/dev/null
echo "https://mehzdonrcbsxkpoehkuk.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview --force 2>/dev/null
echo "https://mehzdonrcbsxkpoehkuk.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL development --force 2>/dev/null

echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1laHpkb25yY2JzeGtwb2Voa3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTU5NjQsImV4cCI6MjA4OTMzMTk2NH0.K1cOn9kXg8TbcfJ-VjuQVm7hip_3Rz2U99lyY9SopNo" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force 2>/dev/null
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1laHpkb25yY2JzeGtwb2Voa3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTU5NjQsImV4cCI6MjA4OTMzMTk2NH0.K1cOn9kXg8TbcfJ-VjuQVm7hip_3Rz2U99lyY9SopNo" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview --force 2>/dev/null
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1laHpkb25yY2JzeGtwb2Voa3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTU5NjQsImV4cCI6MjA4OTMzMTk2NH0.K1cOn9kXg8TbcfJ-VjuQVm7hip_3Rz2U99lyY9SopNo" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development --force 2>/dev/null

echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1laHpkb25yY2JzeGtwb2Voa3VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1NTk2NCwiZXhwIjoyMDg5MzMxOTY0fQ.cF4KgN2Wn99to6aYAQsD53TRGXFJWJjyMRl5cHPNIEI" | vercel env add SUPABASE_SERVICE_ROLE_KEY production --force 2>/dev/null
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1laHpkb25yY2JzeGtwb2Voa3VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1NTk2NCwiZXhwIjoyMDg5MzMxOTY0fQ.cF4KgN2Wn99to6aYAQsD53TRGXFJWJjyMRl5cHPNIEI" | vercel env add SUPABASE_SERVICE_ROLE_KEY preview --force 2>/dev/null
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1laHpkb25yY2JzeGtwb2Voa3VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzc1NTk2NCwiZXhwIjoyMDg5MzMxOTY0fQ.cF4KgN2Wn99to6aYAQsD53TRGXFJWJjyMRl5cHPNIEI" | vercel env add SUPABASE_SERVICE_ROLE_KEY development --force 2>/dev/null

echo "AIzaSyArlccurHyFIcWXPtS-oT_qvc5J37nBbKE" | vercel env add GEMINI_API_KEY production --force 2>/dev/null
echo "AIzaSyArlccurHyFIcWXPtS-oT_qvc5J37nBbKE" | vercel env add GEMINI_API_KEY preview --force 2>/dev/null
echo "AIzaSyArlccurHyFIcWXPtS-oT_qvc5J37nBbKE" | vercel env add GEMINI_API_KEY development --force 2>/dev/null

echo ""
echo "✓ All env vars added. Deploying to production..."
vercel --prod

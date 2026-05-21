// BigQuery schema reference for SQL generation
// Dataset: golden-keel-492520-g3.apollo

export const BQ_SCHEMA = `
-- Dataset: golden-keel-492520-g3.apollo

-- TABLE: apollo.people (93M rows)
-- Apollo contact database
-- Key columns:
--   person_name STRING              -- Full name
--   person_first_name_unanalyzed STRING -- First name (lowercase)
--   person_last_name_unanalyzed STRING  -- Last name (lowercase)
--   person_title STRING             -- Current job title
--   person_title_normalized STRING  -- Normalized title (lowercase)
--   person_functions STRING         -- Department functions (JSON array, e.g. "['sales','marketing']")
--   person_seniority STRING         -- Seniority level (e.g. 'entry', 'senior', 'manager', 'director', 'vp', 'c_suite')
--   person_detailed_function STRING -- Detailed function/role
--   person_email STRING             -- Email address
--   person_email_status_cd STRING   -- Email status ('Verified', 'Pending Manual Verification', etc.)
--   person_phone STRING             -- Phone number
--   person_linkedin_url STRING      -- LinkedIn profile URL
--   person_location_city STRING     -- City
--   person_location_state STRING    -- State
--   person_location_country STRING  -- Country
--   person_location_postal_code STRING -- Postal code
--   person_location_city_with_state_or_country STRING -- "City, State" or "City, Country"
--   sanitized_organization_name_unanalyzed STRING -- Company name (lowercase)
--   current_organization_ids STRING -- Apollo org IDs
--   job_start_date STRING           -- Job start date
--   primary_title_normalized_for_faceting STRING -- Title for faceting/filtering

-- TABLE: apollo.linkedin_us (39.9M rows)
-- LinkedIn US contact database — richer company data
-- Key columns:
--   full_name STRING                -- Full name
--   first_name STRING               -- First name
--   last_name STRING                -- Last name
--   job_title STRING                -- Current job title
--   sub_role STRING                 -- Sub-role/specialty
--   industry STRING                 -- Person's industry
--   industry_2 STRING               -- Secondary industry
--   emails STRING                   -- Email addresses
--   mobile STRING                   -- Mobile phone
--   phone_numbers STRING            -- Phone numbers
--   company_name STRING             -- Company name
--   company_industry STRING         -- Company industry
--   company_website STRING          -- Company website/domain
--   company_size STRING             -- Company size range (e.g. '51-200')
--   company_founded STRING          -- Year founded
--   location STRING                 -- Full location string
--   locality STRING                 -- City
--   metro STRING                    -- Metro area
--   region STRING                   -- State/region
--   location_country STRING         -- Country
--   skills STRING                   -- Skills list
--   linkedin_url STRING             -- LinkedIn URL
--   linkedin_username STRING        -- LinkedIn username
--   company_linkedin_url STRING     -- Company LinkedIn URL
--   company_location_name STRING    -- Company location
--   company_location_locality STRING -- Company city
--   company_location_region STRING  -- Company state
--   company_location_country STRING -- Company country
--   company_location_postal_code STRING -- Company postal code
--   start_date STRING               -- Job start date
--   job_summary STRING              -- Job description/summary
--   inferred_salary STRING          -- Inferred salary
--   years_experience STRING         -- Years of experience
--   summary STRING                  -- Profile summary

-- TABLE: apollo.orgs (6M rows)
-- Apollo organization database
-- NOTE: Columns are unnamed (string_field_0 through string_field_106)
-- Key known mappings:
--   string_field_0 = Apollo org ID
--   string_field_1 = Company name
--   string_field_27 = LinkedIn company URL (JSON array)
--   string_field_34 = Employee count
--   string_field_35 = Department breakdown (JSON dict)

-- USAGE NOTES:
-- 1. linkedin_us has the cleanest schema and richest company data — prefer it for campaigns targeting specific industries/company sizes
-- 2. people table has more rows but company data is limited to name only — best for title/function/seniority filtering
-- 3. Always use WHERE filters on indexed columns — Karl pays the BQ bill
-- 4. Always include LIMIT (default 1000)
-- 5. For email campaigns, prefer records where email is not null
`

# Central Florida Food Access Gaps: Solution Specification

Freddy Vergara, Pedro Quintero, and Fabian Rico

## 1. Purpose

This specification defines a decision-support solution that shows where Central Florida residents face food-access gaps, what kind of gap each area has, and how confident the analysis is. It is written for the client team that will use, approve and maintain the solution.

| Item | Value |
| --- | --- |
| Project | DataKind Beacon, Challenge 2: Food Access & Nutrition Gaps |
| Event | DevFest Florida 2026 hackathon |
| Geography | Orange, Osceola, Seminole and Lake counties (490 census tracts) |
| Version | 1.1, draft for client review (adds the upload portal architecture) |
| Deliverables | Tract-level dataset, Excel summary, BigQuery tables, Looker Studio report, prototype dashboard, gap engine for the upload portal |

## 2. Problem statement

Food-assistance organizations in Central Florida must decide where to place limited pantries, trucks, outreach staff and funding, but they lack a local, tract-level view that explains why each area struggles. Today these decisions rely on experience, word of mouth or national maps that hide local differences.

### Food access is not one problem

Two neighborhoods can both look "underserved" for very different reasons, and each reason calls for a different response.

| Gap type | What it looks like in the data | Recommended response |
| --- | --- | --- |
| Classic food desert | High poverty and far from a SNAP-authorized store | Partner store or mobile pantry |
| Vehicle-compounded gap | Far from a store and many households without a car | Transportation help, delivery, pantry on a bus route |
| SNAP enrollment gap | High poverty but low SNAP participation | Enrollment outreach and events |
| Possible blind spot | No single extreme value, but several elevated signals | Field check before investing |
| Insufficient data | Missing values or too few residents to trust estimates | Collect more data; do not act yet |

### Why it is hard

- **Scattered data.** Census, USDA and CDC sources use different formats, encodings and IDs.
- **Missing transportation data.** CDC PLACES transportation measures are blank for Central Florida tracts.
- **Uncertain estimates.** Census survey values carry margins of error that are wide in small tracts.
- **National thresholds hide local need.** Central Florida tracts must be compared with each other, not only with the whole country.
- **Users need answers, not tables.** Decision makers want a map and a short list, not a 40-column spreadsheet.

## 3. Goals and success criteria

The solution succeeds when a program manager can pick the right intervention for the right neighborhood in under five minutes, and knows how much to trust that choice.

The client asked the dashboard to answer three questions:

| # | Client question | How the solution answers it |
| --- | --- | --- |
| Q1 | Where are the food-access gaps? | Red-scale tract map, county filter, ranked tract table, people affected |
| Q2 | What type of gap is it? | Gap type per tract, counts and people by type and county, recommended response |
| Q5 | What don't we know? | Blind spots, wide-error estimates and missing data by county, with data limits stated |

Success criteria:

1. Every one of the 490 tracts has a gap type, a confidence level and a recommended response, or is marked as not evaluated.
2. Totals match across every deliverable (dataset, Excel, BigQuery, Looker Studio, prototype).
3. Every rule and data limitation is written down and traceable to a source.

## 4. Scope

**In scope**

- 490 census tracts (2020 boundaries) in Orange, Osceola, Seminole and Lake counties
- Classification of each tract into the five gap types, with confidence and review tier
- Tract-level dataset, SNAP retailer list and Excel summary
- BigQuery tables and a three-page Looker Studio report (Q1, Q2, Q5) plus an optional scenario page
- Interactive prototype dashboard with poverty and vehicle scenario sliders
- Method, data dictionary and data-limit documentation, plus the target architecture for an upload portal that recomputes the gaps and writes them to BigQuery (section 8.2)

**Out of scope (this phase)**

- Driving or transit travel times (straight-line distance is used)
- Time-series forecasting; the scenario model is a what-if tool
- Household- or person-level data
- Scheduled automatic downloads from Census and USDA (new data arrives through the upload portal)
- Counties outside the four listed

## 5. Data sources

All inputs are public and joined by the 11-digit census tract ID (GEOID).

| Source | Fields used | Known limits |
| --- | --- | --- |
| Census ACS 5-year 2024, S1701 | Poverty rate and margin of error | Survey estimate; wide error in small tracts |
| Census ACS 5-year 2024, S2201 | SNAP participation rate, SNAP households, margin of error | Same as above |
| Census ACS 5-year 2024, S0101 | Total population | Same as above |
| Census ACS 5-year 2024, S1901 | Median household income | Same as above |
| USDA ERS Food Access Research Atlas | Urban flag, low-income tract flag, households without a vehicle, occupied housing units | Based on 2020 census tracts |
| USDA SNAP Retailer Access Map (July 2026 release) | Low-income/low-access flag, low-access flag, no-vehicle low-access flag and share | Straight-line distance to SNAP stores |
| USDA SNAP retailer locations | 1,695 authorized retailers in the four counties | Store list only; no hours or prices |
| CDC PLACES 2025 | Lack of transportation measure | Blank for Central Florida tracts; replaced by the USDA no-vehicle measures |
| Census 2020 tract boundaries | Tract polygons for the map | None material |

## 6. Method

Each tract is ranked against the other 490 Central Florida tracts, then classified with transparent rules adapted from the challenge's gap taxonomy (Appendix B).

### 6.1 Processing steps

1. Load each source, read USDA files with Latin-1 encoding, and standardize GEOID to 11 characters.
2. Keep the 490 tracts in the four counties and join all sources by GEOID.
3. Compute quartiles (Q1 lowest to Q4 highest) within the region for poverty rate, SNAP rate and no-vehicle low-access share.
4. Apply the classification rules below; a tract may receive a primary and a secondary gap.
5. Score confidence and assign a review tier.
6. Export the dataset, Excel summary, BigQuery files and map polygons.

### 6.2 Classification rules

| Order | Gap type | Rule |
| --- | --- | --- |
| 1 | Insufficient data | Poverty or low-income/low-access value missing, or population under 500 |
| 2 | Classic food desert | Poverty in Q4 and USDA low-income/low-access flag = 1 |
| 3 | Vehicle-compounded gap | USDA low-access flag = 1 and (USDA no-vehicle low-access flag = 1 or no-vehicle share in Q4) |
| 4 | SNAP enrollment gap | Poverty in Q4 and SNAP rate in Q1 or Q2 |
| 5 | Possible blind spot | No measure in Q4, but at least two of poverty, SNAP and no-vehicle share in Q3 |

The first matching gap becomes the primary gap; a second match is stored as the secondary gap.

### 6.3 Confidence and review tiers

Confidence adds points for evidence quality:

- Poverty margin of error at or below 30% of the estimate: 2 points (at or below 50%: 1 point)
- Population of 2,500 or more: 1 point
- A secondary gap that supports the primary: 1 point
- Not a blind spot: 1 point

High = 4 or more points, Medium = 2 to 3, Low = below 2.

| Review tier | Who | Tracts |
| --- | --- | --- |
| Tier 1, ready to act | High confidence | 26 |
| Tier 2, team review | Medium confidence | 120 |
| Review required | Low confidence, blind spots, insufficient data | 63 |

The tiers are a placeholder until the client confirms its own review rules (Appendix A).

### 6.4 Scenario model

The prototype includes a what-if model, not a time-series forecast. The user raises or lowers poverty rates (−20% to +40%) and the no-vehicle share (−20% to +50%); the model recounts gap tracts using fixed regional thresholds (75th percentile of poverty and no-vehicle share, median SNAP rate). It counts 148 gap tracts at baseline instead of 149 because it uses interpolated thresholds rather than quartile labels.

## 7. Key findings

149 of 490 tracts (30%) have a food-access gap, home to about 948,600 people, or 34% of the region's 2.79 million residents. Orange County holds 90 of those tracts and about 577,400 of those people.

| County | Tracts | Classic food desert | Vehicle-compounded | SNAP enrollment | Possible blind spot | Insufficient data | People in gap tracts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Orange | 267 | 49 | 36 | 5 | 26 | 2 | 577,381 |
| Osceola | 59 | 13 | 15 | 0 | 8 | 0 | 196,282 |
| Lake | 75 | 2 | 15 | 0 | 8 | 0 | 94,565 |
| Seminole | 89 | 4 | 10 | 0 | 16 | 0 | 80,404 |
| **Total** | **490** | **68** | **76** | **5** | **58** | **2** | **948,632** |

Counts are by primary gap. Including secondary gaps, 108 tracts (about 697,700 people) have a vehicle-compounded gap and 12 (about 63,000 people) a SNAP enrollment gap.

- **Transportation is the most widespread barrier.** Vehicle access appears in more gap tracts than any other factor.
- **Classic food deserts concentrate in Orange County**, with 49 of the region's 68.
- **Uncertainty is significant.** 58 blind-spot tracts hold about 315,800 people, and 105 of the 149 gap tracts have wide margins of error.
- **Scenario:** if poverty rose 10% across the region, the model flags about 10 more tracts and about 47,900 more people.

## 8. Solution architecture and deliverables

### 8.1 Target architecture: upload portal

After the hackathon, a web portal replaces manual CSV handling: an administrator uploads the source files, the portal computes the gaps and writes them to BigQuery, and every application reads from there.

<img width="900" height="482" alt="image" src="https://github.com/user-attachments/assets/42fca8c2-5237-4314-85d9-20e17960ac03" />

BigQuery is the single source of truth: the portal is the only component that writes, and all consumers read.

| Component | Technology | Responsibility |
| --- | --- | --- |
| Upload portal | React + Node.js, built in Google AI Studio, hosted on Cloud Run | Google sign-in, file upload, column validation, gap engine, write results |
| Gap engine | `foodGapEngine.js` | Same rules as section 6; tested to reproduce 490 tracts, 149 gap tracts, 948,632 people |
| Firebase | Authentication, Firestore, Cloud Storage | Sign-in, user roles (uploader or viewer), upload status, original CSV archive |
| BigQuery | Dataset `food_access` | Tract results versioned by `upload_id`, tract shapes, SNAP retailers, upload log |
| Data API | Node.js on Cloud Run | Read-only endpoints for other applications, one API key per application |
| Dashboard and Looker Studio | Web page, Looker Studio | Read the latest upload (or a chosen one) from BigQuery |

### 8.2 Upload flow

1. The administrator signs in with Google; only users with the uploader role see the upload page.
2. The administrator selects the seven files (ACS S0101, S1701, S2201, S1901; USDA SRAM straight-line and general tract files; SNAP retailer locations).
3. The portal detects each file by its columns and stops with a clear message if a file or column is missing.
4. The original files are saved to Cloud Storage and an upload record is created with status "processing".
5. The gap engine builds the 490-tract result and the retailer list.
6. Results are written to BigQuery in one load job per table, tagged with the `upload_id`.
7. The upload record changes to "ready" with its totals, or to "error" with the reason.
8. Consumers show the latest ready upload by default; earlier uploads stay available for comparison.

### 8.4 Database choice and cost

BigQuery stores the analytical data because other applications need SQL, Looker Studio connects natively, and it supports map shapes. Firestore holds only app data (roles and upload status).

| Option | Fit for this solution | Cost at this volume |
| --- | --- | --- |
| BigQuery Sandbox (no billing) | Hackathon demo only: no inserts, tables expire after 60 days | Free |
| BigQuery with billing enabled | Production: load jobs, permanent tables, free tier of about 10 GB storage and 1 TB queries per month | Expected $0 (each upload is under 1 MB) |
| Firebase Spark (free) | Auth, Firestore and Hosting | Free |
| Firebase Blaze (pay as you go) | Needed for Cloud Functions or App Hosting | Expected $0 at this volume |

Set a budget alert (for example, $1 per month) in Google Cloud Billing. Sources: [BigQuery sandbox](https://docs.cloud.google.com/bigquery/docs/sandbox), [Google AI Studio Build mode](https://ai.google.dev/gemini-api/docs/aistudio-build-mode).

### 8.5 API endpoints

TrackWise data is available through the TrackWise API (Express on Cloud Run) and, read-only, through the Firestore REST API. Full request examples and a Postman collection are in `TrackWise_API.md`.

| Endpoint | Method | TrackWise API | Firestore REST |
| --- | --- | --- | --- |
| Regional summary | GET | `/api/v1/summary` | `GET /summary_metrics/regional_summary` |
| Single tract by GEOID | GET | `/api/v1/tracts/{geoid}` | `GET /census_tracts/{geoid}` |
| All 490 tracts | GET / POST | `/api/v1/tracts` | `POST :runQuery` on `census_tracts` |
| Tracts by county and gap type | GET | `/api/v1/tracts?county=&gap_type=` | `POST :runQuery` with a filter |
| SNAP retailers | GET / POST | `/api/v1/snap-retailers?county=` | `POST :runQuery` on `snap_retailers` |
| Tracky assistant | POST | `/api/chat` with `{"message": "…"}` | — |

Firestore REST base: `https://firestore.googleapis.com/v1/projects/{projectId}/databases/{databaseId}/documents`, with the Firebase web API key as `?key=`. Firestore rules allow public read on the dataset collections and deny all client writes; the key is restricted to the Firestore API and the app's domains and is not published in this document.

## 9. Data dictionary

One row per census tract in `food_gaps_bq.csv` and the BigQuery table `hackathon.food_gaps_map`.

| Field | Type | Description |
| --- | --- | --- |
| `GEOID` | Text | 11-digit 2020 census tract ID |
| `tract_name`, `county` | Text | Census tract name and county |
| `population`, `households` | Number | Total residents and households (ACS) |
| `poverty_rate`, `poverty_rate_moe` | Number | % below the poverty line and its margin of error |
| `snap_rate`, `snap_rate_moe`, `snap_households` | Number | % of households receiving SNAP, margin of error, count |
| `median_household_income` | Number | US dollars (ACS) |
| `lila_flag`, `low_access_flag` | 0/1 | USDA low-income/low-access and low-access flags |
| `no_vehicle_low_access_flag`, `no_vehicle_low_access_pct` | 0/1, % | USDA no-vehicle households far from a SNAP store |
| `households_no_vehicle`, `no_vehicle_pct` | Number, % | Households without a vehicle |
| `urban_flag`, `low_income_tract_flag` | 0/1 | USDA urban and low-income tract flags |
| `poverty_q`, `snap_q`, `vehicle_q` | 1 to 4 | Regional quartile of each measure |
| `primary_gap`, `secondary_gap` | Text | Gap type (section 6.2) |
| `gap_label`, `gap_severity` | Text, 0 to 4 | Display label and map shading value |
| `has_gap` | 0/1 | 1 = classic, vehicle-compounded or SNAP enrollment gap |
| `confidence` | High / Medium / Low | Section 6.3 |
| `supporting_evidence`, `limiting_evidence` | Text | Plain-language reasons for and against |
| `recommended_resource` | Text | Suggested response |
| `review_tier` | Text | Tier 1, Tier 2 or Review required |
| `wide_moe`, `is_unknown`, `unknown_reason` | 0/1, Text | Flags for the Q5 page |
| `model_gap_now`, `scenario_gap_pov10`, `scenario_new_gap_pov10`, `poverty_rate_pov10` | 0/1, % | Scenario model at baseline and with poverty +10% |
| `tract_geom` | Geography | Tract polygon (BigQuery only) |

## 10. Assumptions, risks and open items

| Type | Item | Impact | Mitigation |
| --- | --- | --- | --- |
| Assumption | USDA no-vehicle measures stand in for CDC transportation data | Vehicle gaps may differ from a true transit measure | State the substitution on the report; revisit if CDC publishes Florida values |
| Assumption | Straight-line distance to SNAP stores | Understates barriers where roads or highways split neighborhoods | Validate top tracts in the field |
| Risk | Wide margins of error in 105 gap tracts | Some tracts may be misclassified | Confidence levels and review tiers; field checks before investing |
| Risk | Regional quartiles shift when data is refreshed | Tracts near a boundary may change type | Keep a snapshot per release and compare |
| Risk | Public census tract table in BigQuery may use older tract IDs | Missing shapes on the map | Use the delivered 2020 tract shapes |
| Open | Client review tiers (Appendix A) not yet received | Tiers are placeholders | Replace when provided |
| Open | ZIP code and city per tract not yet added | Q5 cannot be filtered by ZIP | Add when the HUD or Census tract-ZIP file is provided |

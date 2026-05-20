# INCLURA DATABASE STRUCTURE
Enterprise Social Ecosystem Database Architecture

---

# DATABASE OVERVIEW

Inclura uses a hybrid scalable architecture:

- PostgreSQL → relational critical systems
- MongoDB → social content & flexible documents
- Redis → caching & real-time systems
- Cloud Storage → media storage
- Elasticsearch → search engine

---

# CORE DATABASES

| Database | Purpose |
|---|---|
| PostgreSQL | Financial + relational data |
| MongoDB | Social feeds + content |
| Redis | Realtime cache |
| Elasticsearch | Search |
| Cloud Storage | Media files |

---

# =========================================================
# USERS SYSTEM
# =========================================================

# TABLE: users

| Field | Type |
|---|---|
| id | UUID |
| full_name | VARCHAR |
| username | VARCHAR |
| email | VARCHAR |
| phone | VARCHAR |
| password_hash | TEXT |
| role | ENUM |
| profile_photo | TEXT |
| cover_photo | TEXT |
| bio | TEXT |
| location | VARCHAR |
| website | VARCHAR |
| verified | BOOLEAN |
| accessibility_enabled | BOOLEAN |
| created_at | TIMESTAMP |
| updated_at | TIMESTAMP |

---

# TABLE: user_roles

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| role_type | ENUM |
| assigned_at | TIMESTAMP |

Roles:
- user
- creator
- mentor
- business
- admin

---

# TABLE: accessibility_preferences

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| screen_reader | BOOLEAN |
| voice_navigation | BOOLEAN |
| sign_language_support | BOOLEAN |
| high_contrast | BOOLEAN |
| reduced_motion | BOOLEAN |
| keyboard_navigation | BOOLEAN |
| font_scaling | BOOLEAN |
| captions_enabled | BOOLEAN |

---

# =========================================================
# SOCIAL SYSTEM
# =========================================================

# COLLECTION: posts

| Field | Type |
|---|---|
| _id | ObjectId |
| author_id | UUID |
| content | TEXT |
| media_urls | ARRAY |
| hashtags | ARRAY |
| mentions | ARRAY |
| visibility | ENUM |
| created_at | TIMESTAMP |

---

# COLLECTION: reels

| Field | Type |
|---|---|
| _id | ObjectId |
| creator_id | UUID |
| video_url | TEXT |
| caption | TEXT |
| music | TEXT |
| duration | INTEGER |
| likes_count | INTEGER |
| comments_count | INTEGER |
| shares_count | INTEGER |
| created_at | TIMESTAMP |

---

# TABLE: comments

| Field | Type |
|---|---|
| id | UUID |
| post_id | UUID |
| user_id | UUID |
| content | TEXT |
| created_at | TIMESTAMP |

---

# TABLE: likes

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| target_id | UUID |
| target_type | ENUM |
| created_at | TIMESTAMP |

---

# TABLE: saved_posts

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| post_id | UUID |
| saved_at | TIMESTAMP |

---

# =========================================================
# TAGGED SYSTEM
# =========================================================

# TABLE: tagged_content

| Field | Type |
|---|---|
| id | UUID |
| tagged_user_id | UUID |
| content_owner_id | UUID |
| content_id | UUID |
| content_type | ENUM |
| approval_status | ENUM |
| created_at | TIMESTAMP |

---

# =========================================================
# MESSAGING SYSTEM
# =========================================================

# TABLE: conversations

| Field | Type |
|---|---|
| id | UUID |
| type | ENUM |
| created_at | TIMESTAMP |

---

# TABLE: conversation_members

| Field | Type |
|---|---|
| id | UUID |
| conversation_id | UUID |
| user_id | UUID |

---

# TABLE: messages

| Field | Type |
|---|---|
| id | UUID |
| conversation_id | UUID |
| sender_id | UUID |
| message_type | ENUM |
| content | TEXT |
| attachment_url | TEXT |
| seen | BOOLEAN |
| created_at | TIMESTAMP |

Message Types:
- text
- image
- video
- voice
- file

---

# =========================================================
# LIVESTREAM SYSTEM
# =========================================================

# TABLE: livestream_rooms

| Field | Type |
|---|---|
| id | UUID |
| host_id | UUID |
| title | VARCHAR |
| stream_key | TEXT |
| thumbnail | TEXT |
| is_live | BOOLEAN |
| started_at | TIMESTAMP |
| ended_at | TIMESTAMP |

---

# TABLE: livestream_viewers

| Field | Type |
|---|---|
| id | UUID |
| livestream_id | UUID |
| viewer_id | UUID |
| joined_at | TIMESTAMP |

---

# TABLE: livestream_chat

| Field | Type |
|---|---|
| id | UUID |
| livestream_id | UUID |
| sender_id | UUID |
| message | TEXT |
| sent_at | TIMESTAMP |

---

# =========================================================
# MARKETPLACE SYSTEM
# =========================================================

# TABLE: marketplace_products

| Field | Type |
|---|---|
| id | UUID |
| vendor_id | UUID |
| product_name | VARCHAR |
| description | TEXT |
| price | DECIMAL |
| stock | INTEGER |
| category | VARCHAR |
| product_images | ARRAY |
| created_at | TIMESTAMP |

---

# TABLE: marketplace_orders

| Field | Type |
|---|---|
| id | UUID |
| buyer_id | UUID |
| product_id | UUID |
| quantity | INTEGER |
| total_amount | DECIMAL |
| status | ENUM |
| ordered_at | TIMESTAMP |

---

# TABLE: marketplace_reviews

| Field | Type |
|---|---|
| id | UUID |
| reviewer_id | UUID |
| product_id | UUID |
| rating | INTEGER |
| review | TEXT |
| created_at | TIMESTAMP |

---

# =========================================================
# WALLET & PAYMENTS
# =========================================================

# TABLE: wallets

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| balance | DECIMAL |
| currency | VARCHAR |
| updated_at | TIMESTAMP |

---

# TABLE: transactions

| Field | Type |
|---|---|
| id | UUID |
| wallet_id | UUID |
| transaction_type | ENUM |
| amount | DECIMAL |
| reference | VARCHAR |
| status | ENUM |
| created_at | TIMESTAMP |

Transaction Types:
- deposit
- withdrawal
- purchase
- payout
- commission

---

# TABLE: payouts

| Field | Type |
|---|---|
| id | UUID |
| creator_id | UUID |
| amount | DECIMAL |
| payout_method | VARCHAR |
| status | ENUM |
| requested_at | TIMESTAMP |

---

# =========================================================
# PAY & TOP-UP SYSTEM
# =========================================================

# TABLE: airtime_purchases

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| network | VARCHAR |
| phone_number | VARCHAR |
| amount | DECIMAL |
| status | ENUM |
| created_at | TIMESTAMP |

Networks:
- MTN
- Airtel
- Glo
- 9mobile
- Smile
- International Airtime

---

# TABLE: data_bundle_purchases

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| provider | VARCHAR |
| bundle_name | VARCHAR |
| phone_number | VARCHAR |
| amount | DECIMAL |
| status | ENUM |
| created_at | TIMESTAMP |

Providers:
- MTN Data
- Airtel Data
- Glo Data
- 9mobile SME
- Smile Data
- T2 9mobile
- Glo Best Value

---

# TABLE: electricity_bills

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| disco_provider | VARCHAR |
| meter_number | VARCHAR |
| amount | DECIMAL |
| status | ENUM |
| created_at | TIMESTAMP |

---

# TABLE: education_payments

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| institution | VARCHAR |
| student_id | VARCHAR |
| amount | DECIMAL |
| created_at | TIMESTAMP |

---

# =========================================================
# CARE-GIGS SYSTEM
# =========================================================

# TABLE: caregivers

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| specialization | VARCHAR |
| certifications | TEXT |
| years_experience | INTEGER |
| accessibility_services | ARRAY |

---

# TABLE: care_gigs

| Field | Type |
|---|---|
| id | UUID |
| caregiver_id | UUID |
| title | VARCHAR |
| description | TEXT |
| pricing | DECIMAL |
| platform_percentage | DECIMAL |
| availability | BOOLEAN |

---

# TABLE: care_bookings

| Field | Type |
|---|---|
| id | UUID |
| client_id | UUID |
| caregiver_id | UUID |
| booking_date | TIMESTAMP |
| status | ENUM |

---

# =========================================================
# EMERGENCY SYSTEM
# =========================================================

# TABLE: emergency_alerts

| Field | Type |
|---|---|
| id | UUID |
| sender_id | UUID |
| emergency_type | VARCHAR |
| location | TEXT |
| status | ENUM |
| created_at | TIMESTAMP |

---

# TABLE: emergency_responders

| Field | Type |
|---|---|
| id | UUID |
| alert_id | UUID |
| responder_id | UUID |
| response_time | TIMESTAMP |

---

# =========================================================
# MENTORSHIP SYSTEM
# =========================================================

# TABLE: mentors

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| expertise | ARRAY |
| hourly_rate | DECIMAL |
| bio | TEXT |

---

# TABLE: mentorship_sessions

| Field | Type |
|---|---|
| id | UUID |
| mentor_id | UUID |
| student_id | UUID |
| session_time | TIMESTAMP |
| duration | INTEGER |
| amount | DECIMAL |

---

# =========================================================
# ANALYTICS SYSTEM
# =========================================================

# TABLE: creator_analytics

| Field | Type |
|---|---|
| id | UUID |
| creator_id | UUID |
| impressions | INTEGER |
| reach | INTEGER |
| engagement | INTEGER |
| earnings | DECIMAL |
| date | DATE |

---

# =========================================================
# SECURITY SYSTEM
# =========================================================

# TABLE: login_history

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| ip_address | VARCHAR |
| device | TEXT |
| login_time | TIMESTAMP |

---

# TABLE: reports

| Field | Type |
|---|---|
| id | UUID |
| reporter_id | UUID |
| target_id | UUID |
| reason | TEXT |
| status | ENUM |
| created_at | TIMESTAMP |

---

# TABLE: bans

| Field | Type |
|---|---|
| id | UUID |
| user_id | UUID |
| reason | TEXT |
| banned_until | TIMESTAMP |

---

# =========================================================
# SEARCH SYSTEM
# =========================================================

# ELASTICSEARCH INDEXES

- users_index
- posts_index
- reels_index
- marketplace_index
- mentorship_index
- tagged_content_index

---

# =========================================================
# REDIS SYSTEM
# =========================================================

Used For:

- livestream realtime chats
- notifications
- session caching
- API rate limiting
- websocket scaling
- trending feeds
- realtime messaging

---

# =========================================================
# CLOUD STORAGE
# =========================================================

Stores:

- images
- reels
- livestream recordings
- documents
- profile photos
- voice notes
- accessibility media

Recommended:
- AWS S3
- Cloudflare R2

---

# =========================================================
# FINAL NOTES
# =========================================================

Inclura database architecture is designed for:

- scalability
- accessibility
- creator economy
- realtime systems
- financial systems
- enterprise social networking
- global expansion
- high availability

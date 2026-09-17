# AI Development Logs — CafePoints Loyalty Platform

> **Note:** This document records the AI-assisted development process used while building and improving the CafePoints Loyalty Platform. The original Claude conversation transcript is not currently available, so this document is a reconstructed development log rather than a verbatim export of the original Claude conversation.

---

## 1. Initial Project Request

### User Request

I need to build a full-stack loyalty points platform for a cafe/restaurant. The application should allow customers to earn loyalty points when they make purchases and redeem those points for rewards.

The application should have a frontend and backend and should use a database to persist users, members, transactions, and rewards.

### AI Direction

The project was structured as a full-stack JavaScript application.

Proposed architecture:

* Frontend: React + Vite
* Backend: Node.js + Express.js
* Database: MongoDB
* ODM: Mongoose
* Authentication: JWT
* Password hashing: bcrypt
* API communication: REST APIs

The application was named **CafePoints**.

---

# 2. Initial Application Structure

### User Request

Create the basic project structure for a loyalty management system.

### AI Response / Implementation Direction

The project was organized into two main applications:

```text
cafepoints/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── server.js
│   ├── package.json
│   └── ...
│
├── README.md
└── .gitignore
```

The backend was designed around REST APIs while the frontend consumed those APIs.

---

# 3. Database Design

### User Request

The application needs persistent data for users, loyalty members, transactions, and rewards.

### AI Design

The following MongoDB/Mongoose models were used:

### User

Used for application authentication and role-based access.

Important fields include:

* name
* email
* password
* role

Roles include staff/admin functionality.

### Member

Represents a cafe loyalty customer.

Important information includes:

* customer/member number
* name
* phone
* email
* points
* lifetime points
* loyalty tier
* timestamps

### Transaction

Stores loyalty-related transactions.

Examples:

* purchase
* points earned
* points redeemed
* points expired

### Reward

Represents rewards that members can redeem using loyalty points.

---

# 4. Authentication

### User Request

The application should have secure authentication for staff/admin users.

### AI Direction

JWT-based authentication was implemented.

Passwords are hashed using bcrypt rather than being stored directly.

The backend uses authentication middleware to protect routes that require an authenticated user.

The JWT is configured through environment variables.

Example configuration:

```env
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
```

---

# 5. Loyalty Points System

### User Request

Implement a purchase flow where a customer can earn loyalty points.

### AI Implementation Direction

The purchase flow follows this general process:

```text
Customer selected
        ↓
Purchase amount entered
        ↓
Points calculated
        ↓
Member balance updated
        ↓
Lifetime points updated
        ↓
Transaction created
        ↓
Tier evaluated
```

The system keeps track of both:

* current available points
* lifetime earned points

This allows loyalty tiers to be based on lifetime activity rather than only the current balance.

---

# 6. Loyalty Tier System

### Initial Tier Requirements

The loyalty system initially supported multiple tiers based on lifetime points.

The existing tiers needed to remain backward compatible.

The tier calculation was therefore kept centralized so that tier changes could be evaluated whenever a member earns points.

---

# 7. Platinum Tier — T3 Requirement

### User Request

Add a new top-level Platinum tier.

Requirement:

* Lifetime points >= 5000 → Platinum
* Platinum members earn 0.3 points per ₹1
* Existing Bronze/Silver/Gold behavior should remain unchanged.
* Existing members should not be modified unnecessarily.

### AI Design

A new Platinum tier was added to the loyalty configuration.

The tier hierarchy became:

```text
Bronze
Silver
Gold
Platinum
```

The Platinum threshold is:

```text
5000 lifetime points
```

The earning rate for Platinum is:

```text
0.3 points / ₹1
```

Tier calculation is based on lifetime points.

This preserves backward compatibility because members below 5000 lifetime points continue to use their existing tier rules.

---

# 8. Tier Evaluation

### AI Implementation Direction

Tier evaluation is performed after a member earns points.

Conceptually:

```text
Calculate new lifetime points
        ↓
Determine applicable tier
        ↓
Compare old tier with new tier
        ↓
Update member tier
        ↓
If tier changed → trigger notification
```

This ensures a member is upgraded automatically when crossing a tier threshold.

---

# 9. Points Expiration — T2 Requirement

### User Request

Points should expire after 90 days.

A background/job mechanism should identify stale points and remove them from the customer's available balance.

### AI Design

Point expiration was implemented around point-earning transactions.

Each eligible points transaction can have an expiration time.

The expiration period is:

```text
90 days
```

Expired points are deducted from the member's available point balance.

The member's lifetime points are not reduced because lifetime points represent historical earning activity rather than currently available points.

---

# 10. Expiration Job

### User Request

Provide a way to execute the expiration job and make it testable.

### AI Direction

A clock/test endpoint was introduced:

```http
POST /clock
```

The endpoint triggers the expiration processing logic.

The job:

1. Finds eligible points that have passed their expiration time.
2. Determines the amount that should expire.
3. Deducts expired points from the member's available balance.
4. Creates an expiration transaction.
5. Marks the original points as expired/processed where applicable.

This makes the feature deterministic and easier to test than relying exclusively on a real cron scheduler.

---

# 11. Notification Service — T1 Requirement

### User Request

When a customer crosses into a new loyalty tier, the system should notify them.

A Notification Service should be used.

### AI Design

The tier-upgrade logic was separated from the core member update.

When the tier changes:

```text
Tier changed
     ↓
Notification generated
     ↓
Notification placed in outbox
```

This follows an event/outbox-style design rather than directly coupling notification delivery to the purchase request.

---

# 12. Outbox

### User Request

Provide an `/outbox` endpoint so the notification behavior can be evaluated.

### AI Direction

An outbox mechanism was added to record notification events.

A tier upgrade can generate an event containing information such as:

```text
event type
member
previous tier
new tier
timestamp
```

The outbox can then be inspected through the API.

Example endpoint:

```http
GET /outbox
```

This allows an evaluator to verify that a tier transition produced the expected notification event.

---

# 13. API Design

The backend exposes REST endpoints for the major application functions.

The main API categories are:

```text
Authentication
Members
Purchases
Rewards
Redemption
Clock / expiration
Outbox / notifications
```

Representative routes include:

```http
POST /api/auth/register
POST /api/auth/login

GET /api/members
POST /api/members
GET /api/members/:id

POST /api/members/:id/purchase
POST /api/members/:id/redeem

POST /api/clock
GET /api/outbox
```

Exact route availability should be checked against the current backend implementation.

---

# 14. Frontend

### User Request

Create a usable frontend for the loyalty platform.

### AI Direction

The frontend was implemented using React and Vite.

The interface provides functionality around:

* authentication
* member management
* customer lookup
* purchases
* loyalty points
* rewards
* redemption
* transaction information

The frontend communicates with the Express backend using HTTP requests.

---

# 15. Environment Configuration

### User Request

The application should use environment variables for database credentials and application configuration.

### AI Direction

Environment variables were used for sensitive configuration.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_random_secret
JWT_EXPIRES_IN=7d
STAMP_QR_TTL_SECONDS=90
CLIENT_ORIGIN=http://localhost:5173
```

The actual `.env` file should not be committed to GitHub.

A `.env.example` file is provided instead.

---

# 16. Debugging — Backend Environment Error

### Observed Error

The backend produced:

```text
MONGO_URI is not set in .env
```

### Investigation

The issue was caused by the backend process not finding the expected environment configuration.

The environment file was moved/placed where the backend expected it and the variable name was checked.

The expected variable is:

```text
MONGO_URI
```

The `.env` file must be located correctly and must not accidentally be saved as:

```text
.env.txt
```

---

# 17. Frontend Debugging

### Observed Issue

The frontend initially had issues with the loyalty counter functionality.

### Investigation

The counter component referenced state/functionality that was not correctly connected to the component.

The component was corrected so the required state and earning flow were available.

The tier configuration was also updated to include the new Platinum tier.

---

# 18. Customer / Member Flow

### Intended Application Flow

The loyalty workflow was designed as:

```text
Register/Login
      ↓
Create or select member
      ↓
Purchase
      ↓
Points calculated
      ↓
Points added
      ↓
Transaction created
      ↓
Check tier
      ↓
If tier changed → notification/outbox event
      ↓
Redeem reward
      ↓
Points deducted
```

---

# 19. Testing Loyalty Tiers

### Test Scenario

A member starts below the Platinum threshold.

Example:

```text
Lifetime points = 4900
Tier = Gold
```

A purchase generates enough points to cross:

```text
5000 lifetime points
```

Expected behavior:

```text
New lifetime points >= 5000
        ↓
Tier becomes Platinum
        ↓
Platinum earning configuration applies
        ↓
Tier-change notification event generated
```

---

# 20. Testing Point Expiration

### Test Scenario

A points transaction is created with an expiration date 90 days after earning.

After the expiration time passes:

```text
POST /clock
```

Expected behavior:

```text
Expired transaction found
        ↓
Available points reduced
        ↓
Expiration transaction/event recorded
```

Lifetime points remain historical and are not reduced by expiration.

---

# 21. Testing Outbox Notifications

### Test Scenario

A member crosses a tier threshold.

The system evaluates:

```text
old tier != new tier
```

If true, a notification event is generated.

The outbox endpoint can then be queried:

```http
GET /outbox
```

The evaluator can verify that a tier-change event exists.

---

# 22. Backward Compatibility

### Requirement

Adding Platinum must not break the existing loyalty tiers.

### AI Design

The existing tier rules were retained and Platinum was added as a higher tier.

Conceptually:

```text
if lifetimePoints >= 5000
    Platinum
else if lifetimePoints >= Gold threshold
    Gold
else if lifetimePoints >= Silver threshold
    Silver
else
    Bronze
```

This allows existing members to continue operating under the previous rules until they qualify for Platinum.

---

# 23. Security Considerations

The application uses environment variables for sensitive credentials.

Important values such as:

```text
MONGO_URI
JWT_SECRET
```

should never be committed to the public repository.

The repository should contain:

```text
.env.example
```

rather than the real:

```text
.env
```

---

# 24. GitHub Submission Preparation

The final repository was organized so that important evaluator documentation exists at the repository root.

Expected structure:

```text
cafepoints-loyalty-platform/
│
├── README.md
├── REASONING.md
├── AI_LOGS.md
├── .env.example
├── .gitignore
│
├── frontend/
│
├── backend/
│
└── docker-compose.yml
```

The README documents:

* project overview
* setup
* environment variables
* installation
* running frontend
* running backend
* API endpoints
* evaluation flows

The reasoning document explains:

* design decisions
* implementation approach
* testing
* debugging
* fixes

---

# 25. Final Verification Checklist

Before submitting the repository, verify:

```text
[ ] README.md exists in repository root
[ ] REASONING.md exists in repository root
[ ] AI_LOGS.md exists in repository root
[ ] .env.example exists
[ ] .env is NOT committed
[ ] MongoDB connection works
[ ] Backend starts successfully
[ ] Frontend starts successfully
[ ] User authentication works
[ ] Member creation works
[ ] Purchase flow works
[ ] Points are calculated correctly
[ ] Transactions are created
[ ] Platinum tier works
[ ] 90-day expiration logic works
[ ] POST /clock works
[ ] Tier-change notification works
[ ] GET /outbox works
[ ] Reward redemption works
[ ] Points are deducted after redemption
```

---

# 26. Summary of AI-Assisted Development

AI assistance was used throughout the development process to:

* design the full-stack architecture
* structure the MongoDB models
* implement REST APIs
* implement authentication
* implement loyalty point calculations
* add loyalty tiers
* implement Platinum tier requirements
* design point expiration
* implement the expiration test mechanism
* design notification/outbox behavior
* debug frontend and backend issues
* prepare project documentation
* prepare the repository for GitHub submission

The final application is intended to demonstrate a complete loyalty-platform workflow with persistent data, authentication, tier-based rewards, point expiration, and event/outbox functionality.

---

## Important Note

This file is a reconstructed AI-development log prepared after the original Claude conversation became unavailable. It is **not a verbatim transcript of the original Claude conversation** and should not be represented as one.

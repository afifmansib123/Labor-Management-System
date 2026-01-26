#### create user ####

curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "zm@urban.com",
    "password": "einstein14thmarch",
    "role": "masteradmin"
  }'
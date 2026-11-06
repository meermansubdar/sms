import jwt from "jsonwebtoken";

export function generateTestToken(userId, role) {
  return jwt.sign(
    {
      role
    },
    process.env.JWT_SECRET,
    {
      subject: userId.toString(),
      expiresIn: "1h"
    }
  );
}

export function createAuthHeader(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}
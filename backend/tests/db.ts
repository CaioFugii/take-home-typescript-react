import bcrypt from 'bcrypt'
import { dataSource } from '../src/database/data-source'
import { User, type UserRole } from '../src/database/entities'

export async function upsertUser(email: string, password: string, role: UserRole): Promise<void> {
  const hash = await bcrypt.hash(password, 12)
  const users = dataSource.getRepository(User)
  const existing = await users.findOne({ where: { email } })
  if (existing) {
    existing.password = hash
    existing.role = role
    await users.save(existing)
    return
  }
  await users.save(users.create({ email, password: hash, role }))
}

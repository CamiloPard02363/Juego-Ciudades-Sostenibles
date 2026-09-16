import { request } from '../utils/http'

export type TeacherClass = {
  id: string
  name: string
  description: string
  teacherUserId: string
  createdAt: string
}

export type CreateClassInput = {
  name: string
  description?: string
}

export function listMyClasses(token: string): Promise<TeacherClass[]> {
  return request<TeacherClass[]>('/classes/mine', { token })
}

export function createClass(token: string, input: CreateClassInput): Promise<TeacherClass> {
  return request<TeacherClass>('/classes', {
    method: 'POST',
    token,
    body: input,
  })
}

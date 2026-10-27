import { describe, expect, it } from 'vitest'

import {
  averageScoreOf,
  formatAssessmentDate,
  getScoreCategory,
  getStudentProgressMessage,
} from './grades'

describe('getScoreCategory', () => {
  it('memetakan empat nilai resmi ke huruf yang benar', () => {
    expect(getScoreCategory(100).letter).toBe('A')
    expect(getScoreCategory(80).letter).toBe('B')
    expect(getScoreCategory(75).letter).toBe('C')
    expect(getScoreCategory(60).letter).toBe('D')
  })

  it('menerima nilai berupa string karena select mengirim string', () => {
    expect(getScoreCategory('80').letter).toBe('B')
  })

  it('mengembalikan kategori tinjau untuk nilai lama di luar mapping', () => {
    const category = getScoreCategory(90)
    expect(category.letter).toBeNull()
    expect(category.tone).toBe('support')
  })
})

describe('getStudentProgressMessage', () => {
  it('memakai kalimat "dapat" untuk nilai A dan B', () => {
    expect(getStudentProgressMessage(getScoreCategory(100))).toMatch(/^Kamu dapat /)
    expect(getStudentProgressMessage(getScoreCategory(80))).toMatch(/^Kamu dapat /)
  })

  it('memakai kalimat "perlu" untuk nilai C dan D', () => {
    expect(getStudentProgressMessage(getScoreCategory(75))).toMatch(/^Kamu perlu /)
    expect(getStudentProgressMessage(getScoreCategory(60))).toMatch(/^Kamu perlu /)
  })
})

describe('averageScoreOf', () => {
  it('mengembalikan null ketika belum ada nilai', () => {
    expect(averageScoreOf([])).toBeNull()
    expect(averageScoreOf()).toBeNull()
  })

  it('membulatkan rata-rata ke bilangan bulat terdekat', () => {
    expect(averageScoreOf([{ score: 100 }, { score: 75 }])).toBe(88)
  })

  it('memperlakukan nilai yang hilang sebagai nol', () => {
    expect(averageScoreOf([{ score: 80 }, {}])).toBe(40)
  })
})

describe('formatAssessmentDate', () => {
  it('memberi teks pengganti ketika tanggal kosong', () => {
    expect(formatAssessmentDate(null)).toBe('Tanggal penilaian belum tersedia')
  })

  it('mengembalikan nilai asli ketika tanggal tidak dapat diurai', () => {
    expect(formatAssessmentDate('bukan tanggal')).toBe('bukan tanggal')
  })

  it('memformat tanggal API ke bahasa Indonesia', () => {
    const formatted = formatAssessmentDate('2026-10-24 09:30:00')
    expect(formatted).toContain('Oktober')
    expect(formatted).toContain('2026')
  })
})

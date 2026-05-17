import { supabase } from './supabase'

// Vérifie les conditions de chaque badge et les attribue si nécessaire
export async function checkAndAwardBadges(vendeurId, structureId) {
  if (!vendeurId) return

  const [
    { data: allBadges },
    { data: myBadges },
    { data: validatedDojos, count: dojoCount },
    { data: profileData },
    { data: evalData },
    { data: teamDojos },
  ] = await Promise.all([
    supabase.from('badges').select('*'),
    supabase.from('vendeur_badges').select('badge_id').eq('vendeur_id', vendeurId),
    supabase.from('vendeur_dojos').select('id', { count: 'exact' }).eq('vendeur_id', vendeurId).eq('status', 'validated'),
    supabase.from('profiles').select('streak, xp_total').eq('id', vendeurId).single(),
    supabase.from('evaluations').select('score').eq('vendeur_id', vendeurId),
    supabase.from('vendeur_dojos').select('vendeur_id').eq('status', 'validated').in('vendeur_id',
      (await supabase.from('profiles').select('id').eq('structure_id', structureId).eq('role', 'vendeur')).data?.map(v => v.id) || []
    ),
  ])

  const ownedIds = new Set((myBadges || []).map(b => b.badge_id))
  const streak = profileData?.streak || 0
  const dojosValidated = dojoCount || 0
  const avgScore = evalData?.length
    ? evalData.reduce((s, e) => s + e.score, 0) / evalData.length
    : 0

  // Calcul du rang dans la structure
  const dojoCounts = {}
  teamDojos?.forEach(vd => { dojoCounts[vd.vendeur_id] = (dojoCounts[vd.vendeur_id] || 0) + 1 })
  const sorted = Object.entries(dojoCounts).sort((a, b) => b[1] - a[1])
  const myRank = sorted.findIndex(([id]) => id === vendeurId) + 1

  const toAward = []

  for (const badge of (allBadges || [])) {
    if (ownedIds.has(badge.id)) continue

    let earned = false
    switch (badge.condition_type) {
      case 'dojos_validated':
        earned = dojosValidated >= badge.condition_value
        break
      case 'streak_days':
        earned = streak >= badge.condition_value
        break
      case 'leaderboard_top':
        earned = myRank > 0 && myRank <= badge.condition_value
        break
      case 'team_avg_score':
        earned = avgScore >= badge.condition_value
        break
      case 'score_5_comp':
        earned = evalData?.some(e => e.score === 5)
        break
      case 'comp_mastered':
        earned = evalData?.filter(e => e.score >= 4).length >= badge.condition_value
        break
    }

    if (earned) toAward.push({ vendeur_id: vendeurId, badge_id: badge.id })
  }

  if (toAward.length > 0) {
    await supabase.from('vendeur_badges').upsert(toAward, { onConflict: 'vendeur_id,badge_id' })

    // Ajouter les XP pour chaque badge gagné
    const xpInserts = toAward.map(() => ({
      vendeur_id: vendeurId,
      amount: 25,
      reason: 'Badge débloqué',
      source_type: 'badge',
    }))
    await supabase.from('xp_transactions').insert(xpInserts)

    // Mettre à jour le total XP
    const { data: currentProfile } = await supabase
      .from('profiles').select('xp_total').eq('id', vendeurId).single()
    await supabase.from('profiles')
      .update({ xp_total: (currentProfile?.xp_total || 0) + toAward.length * 25 })
      .eq('id', vendeurId)
  }

  return toAward.length
}

// Ajoute des XP et met à jour le streak après validation d'un dojo
export async function rewardDojoValidation(vendeurId) {
  const XP_PER_DOJO = 50

  const { data: prof } = await supabase
    .from('profiles').select('xp_total, streak').eq('id', vendeurId).single()

  const newStreak = (prof?.streak || 0) + 1
  const newXp = (prof?.xp_total || 0) + XP_PER_DOJO

  await Promise.all([
    supabase.from('profiles').update({ xp_total: newXp, streak: newStreak }).eq('id', vendeurId),
    supabase.from('xp_transactions').insert({
      vendeur_id: vendeurId, amount: XP_PER_DOJO,
      reason: 'Dojo validé', source_type: 'dojo',
    }),
  ])
}

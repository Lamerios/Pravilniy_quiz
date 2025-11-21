import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { Card, Avatar, Badge, MiniLineChart, ProgressStat, MiniBarChart, Award } from 'ui';
import GlobalRanks from './GlobalRanks';
import PerformanceTrends from './PerformanceTrends';

const TeamProfile: React.FC = () => {
  const { teamId } = useParams();
  const id = Number(teamId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any | null>(null);
  const [global, setGlobal] = useState<any | null>(null);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [d, gs] = await Promise.all([
          apiClient.getPublicTeamProfile(id),
          apiClient.getPublicStats()
        ]);
        setData(d);
        setGlobal(gs);
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Hooks must be called unconditionally on every render
  const recentPoints: number[] = useMemo(() => (data?.recent_games || []).map((g: any) => Number(g.total) || 0), [data]);
  const recentPlaces: number[] = useMemo(() => (data?.recent_games || []).map((g: any) => Number(g.place) || 0), [data]);
  const winRate = useMemo(() => {
    const games = data?.games_played || 0;
    const wins = data?.placements?.first || 0;
    return games > 0 ? wins / games : 0;
  }, [data]);
  const podiumRate = useMemo(() => {
    const games = data?.games_played || 0;
    const podiums = (data?.placements?.first || 0) + (data?.placements?.second || 0) + (data?.placements?.third || 0);
    return games > 0 ? podiums / games : 0;
  }, [data]);

  // Бенчмарки против лиги
  const benchmarks = useMemo(() => {
    const gr: any[] = global?.global_ranking || [];
    const avgPointsArr = gr.map((x) => Number(x.avg_points) || 0).filter(Number.isFinite);
    const totalPointsArr = gr.map((x) => Number(x.total_points) || 0).filter(Number.isFinite);
    const gamesArr = gr.map((x) => Number(x.games) || 0).filter(Number.isFinite);
    const my = gr.find((x) => Number(x.team_id) === Number(id));
    const myAvg = Number(data?.avg_points) || 0;
    const myTotal = Number(data?.total_points) || 0;
    const myGames = Number(data?.games_played) || 0;
    const pct = (arr: number[], val: number) => {
      if (!arr.length) return 0;
      const rank = arr.filter((v) => v <= val).length;
      return rank / arr.length; // 0..1
    };
    return {
      avg_points_pct: pct(avgPointsArr, myAvg),
      total_points_pct: pct(totalPointsArr, myTotal),
      games_pct: pct(gamesArr, myGames)
    };
  }, [global, data, id]);

  // Бэйджи/звания — объявим позже, после streaks

  // По раундам: если есть round_places (среднее место в раунде), используем его и инвертируем шкалу
  const roundChart = useMemo(() => {
    const rp = (data as any)?.round_places as Array<{ round_number: number; avg_place: number }> | undefined;
    if (Array.isArray(rp) && rp.length) {
      const items = rp
        .map((r) => ({ round: Number(r.round_number || 0), place: Number(r.avg_place || 0) }))
        .filter((x) => Number.isFinite(x.round) && Number.isFinite(x.place))
        .sort((a, b) => a.round - b.round);
      const labels = items.map((i) => i.round);
      const maxPlace = Math.max(1, ...items.map((i) => i.place));
      // Чем меньше место, тем выше столбец: value = maxPlace - place + 1
      const values = items.map((i) => Math.max(0, maxPlace - i.place + 1));
      return { labels, values };
    }
    // Fallback к средним очкам
    const ra = (data as any)?.round_averages;
    const rs = (data as any)?.round_stats;
    let items: { round: number; avg: number }[] = [];
    if (Array.isArray(ra)) {
      items = ra.map((r: any) => ({ round: Number(r.round_number || r.round || 0), avg: Number(r.avg_score || r.avg || 0) }));
    } else if (ra && typeof ra === 'object') {
      items = Object.entries(ra).map(([k, v]: any) => ({ round: Number(k), avg: Number(v) }));
    } else if (Array.isArray(rs)) {
      items = rs.map((r: any) => ({ round: Number(r.round_number || r.round || 0), avg: Number(r.avg_score || r.avg || 0) }));
    }
    items = items.filter(x => Number.isFinite(x.round) && Number.isFinite(x.avg)).sort((a, b) => a.round - b.round);
    const labels = items.length ? items.map(i => i.round) : [1,2,3,4,5,6,7];
    const values = items.length ? items.map(i => i.avg) : [0,0,0,0,0,0,0];
    return { labels, values };
  }, [data]);

  // По шаблонам
  // По шаблонам — временно убрано (нет данных)

  // Серии по последним играм
  const streaks = useMemo(() => {
    const games = Array.isArray(data?.recent_games) ? (data!.recent_games as any[]) : [];
    let wins = 0;
    let podiums = 0;
    for (const g of games) {
      const p = Number(g.place);
      if (p === 1) wins++; else break;
    }
    for (const g of games) {
      const p = Number(g.place);
      if (p >= 1 && p <= 3) podiums++; else break;
    }
    const last5 = games.slice(0, 5);
    const last5Avg = last5.length ? last5.reduce((s, g: any) => s + (Number(g.total) || 0), 0) / last5.length : 0;
    const avg = Number(data?.avg_points) || 0;
    const formRatio = avg > 0 ? last5Avg / avg : 0;
    return { wins, podiums, formRatio };
  }, [data]);

  // Бэйджи/звания (после streaks)
  type BadgeTone = 'achievement' | 'streak' | 'veteran' | 'elite';
  type BadgeItem = { label: string; tone: BadgeTone; tooltip?: string };
  const badges: BadgeItem[] = useMemo(() => {
    const arr: BadgeItem[] = [];
    const g = Number(data?.games_played) || 0;
    const f = Number(data?.placements?.first) || 0;
    const p = (Number(data?.placements?.first)||0) + (Number(data?.placements?.second)||0) + (Number(data?.placements?.third)||0);
    if (f >= 1) arr.push({ label: 'Первая победа', tone: 'achievement', tooltip: 'Первая победа команды' });
    if (f >= 5) arr.push({ label: '5 побед', tone: 'achievement', tooltip: 'Пять побед в истории' });
    if (f >= 10) arr.push({ label: '10 побед', tone: 'achievement', tooltip: 'Десять побед в истории' });
    if (streaks.wins >= 2) arr.push({ label: `Серия побед: ${streaks.wins}`, tone: 'streak', tooltip: 'Количество побед подряд' });
    if (streaks.podiums >= 3) arr.push({ label: `Серия подиумов: ${streaks.podiums}`, tone: 'streak', tooltip: 'Количество подиумов подряд' });
    if (g >= 25) arr.push({ label: 'Ветеран лиги', tone: 'veteran', tooltip: '25+ сыгранных игр' });
    if (benchmarks.avg_points_pct >= 0.9) arr.push({ label: 'Топ‑10% по среднему итогу', tone: 'elite', tooltip: 'Средний итог выше 90% команд' });
    if (benchmarks.total_points_pct >= 0.9) arr.push({ label: 'Топ‑10% по сумме очков', tone: 'elite', tooltip: 'Сумма очков выше 90% команд' });
    return arr;
  }, [data, streaks, benchmarks]);

  const orderedBadges: BadgeItem[] = useMemo(() => {
    const order: Record<BadgeTone, number> = { elite: 0, achievement: 1, streak: 2, veteran: 3 };
    return badges.slice().sort((a, b) => order[a.tone] - order[b.tone]);
  }, [badges]);

  const visibleBadges = showAllBadges ? orderedBadges : orderedBadges.slice(0, 8);

  if (loading) return <div className="loading"><p>Загрузка профиля…</p></div>;
  if (error) return <div className="error"><p>{error}</p></div>;
  if (!data) return <div className="error"><p>Команда не найдена</p></div>;

  const t = data.team;
  return (
    <Card>
      <div className="card-body">

        {orderedBadges.length ? (
          <Card style={{ marginBottom: 12 }}>
            <div className="card-body">
              {/* Блок команды (аватар + название + количество игр) перенесён в «Звания» и сделан крупнее */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: isMobile ? 12 : 16, 
                marginBottom: 8,
                flexWrap: isMobile ? 'wrap' : 'nowrap'
              }}>
                <Avatar name={t.name} src={t.logo_path ? `/uploads/${t.logo_path}` : (t.logo || undefined)} size={isMobile ? 56 : 72} rounded={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: isMobile ? '1.3em' : '1.6em', 
                    lineHeight: 1.1, 
                    fontWeight: 800,
                    wordBreak: 'break-word'
                  }}>{t.name}</div>
                  <div className="muted" style={{ fontSize: '0.95em' }}>Игр: {data.games_played}</div>
                </div>
              </div>

              <h3>Звания</h3>
              <div style={{ display: 'flex', gap: isMobile ? 8 : 12, flexWrap: 'wrap', marginTop: 8 }}>
                {visibleBadges.map((b, i) => {
                  const icon = b.tone === 'achievement' ? '🏆' : b.tone === 'streak' ? '🔥' : b.tone === 'veteran' ? '🛡️' : '👑';
                  const gradient = b.tone === 'achievement'
                    ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                    : b.tone === 'streak'
                    ? 'linear-gradient(135deg, #ef4444, #f97316)'
                    : b.tone === 'veteran'
                    ? 'linear-gradient(135deg, #6b7280, #9ca3af)'
                    : 'linear-gradient(135deg, #7c3aed, #a78bfa)';
                  return <Award key={i} icon={icon} title={b.label} subtitle={b.tone === 'elite' ? 'ELITE' : undefined} gradient={gradient} tooltip={b.tooltip} />;
                })}
              </div>
              {orderedBadges.length > 8 ? (
                <div className="mt-1" />
              ) : null}
              {orderedBadges.length > 8 ? (
                <button className="btn btn-secondary" onClick={() => setShowAllBadges(!showAllBadges)}>
                  {showAllBadges ? 'Скрыть' : `Показать все (${orderedBadges.length})`}
                </button>
              ) : null}
            </div>
          </Card>
        ) : (
          // Даже если званий нет, покажем крупный блок команды
          <Card style={{ marginBottom: 12 }}>
            <div className="card-body">
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: isMobile ? 12 : 16,
                flexWrap: isMobile ? 'wrap' : 'nowrap'
              }}>
                <Avatar name={t.name} src={t.logo_path ? `/uploads/${t.logo_path}` : (t.logo || undefined)} size={isMobile ? 56 : 72} rounded={12} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: isMobile ? '1.3em' : '1.6em', 
                    lineHeight: 1.1, 
                    fontWeight: 800,
                    wordBreak: 'break-word'
                  }}>{t.name}</div>
                  <div className="muted" style={{ fontSize: '0.95em' }}>Игр: {data.games_played}</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Global ranks section */}
        {data?.ranking ? (
          <Card style={{ marginBottom: 12 }}>
            <div className="card-body">
              <h3>Глобальные звания</h3>
              <div className="muted" style={{ marginBottom: 8 }}>
                Текущее звание: <b>{data.ranking.globalRank?.title || '—'}</b>
                {data.ranking.nextRank ? (
                  <span> · Следующее: {data.ranking.nextRank.title} (от {data.ranking.nextRank.minPoints})</span>
                ) : null}
              </div>
              <GlobalRanks ranks={data.ranking.ranks || []} current={data.ranking.globalRank || undefined} progressPercent={data.ranking.progressPercent} />
            </div>
          </Card>
        ) : null}

        {/* Performance Trends */}
        {data?.trends ? (
          <Card style={{ marginBottom: 12 }}>
            <div className="card-body">
              <PerformanceTrends timeline={data.trends.timeline} monthly={data.trends.monthly} trend_score_delta={data.trends.trend_score_delta} />
            </div>
          </Card>
        ) : null}

        <div className="card-grid" style={{ 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))'
        }}>
          <Card><div className="card-body"><h4>Сумма очков</h4><div className="text-2xl">{data.total_points}</div><div className="mt-1"><MiniLineChart data={recentPoints} /></div></div></Card>
          <Card><div className="card-body"><h4>Средний итог</h4><div className="text-2xl">{data.avg_points}</div><div className="mt-1"><MiniLineChart data={recentPlaces.map(p=>-p)} stroke="var(--gray-600)" fill="rgba(0,0,0,0.08)" /></div></div></Card>
          <Card><div className="card-body"><h4>Медали</h4><div>🥇 {data.placements.first} · 🥈 {data.placements.second} · 🥉 {data.placements.third}</div><div className="mt-1"><ProgressStat label="Win rate" value={winRate} /><div className="mt-1" /><ProgressStat label="Podium rate" value={podiumRate} color="var(--violet-500)" /></div></div></Card>
        </div>

        <div className="card-grid" style={{ 
          marginTop: 16,
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))'
        }}>
          <Card>
            <div className="card-body">
              <h3>Сильные/слабые раунды</h3>
              <MiniBarChart labels={roundChart.labels} values={roundChart.values} />
            </div>
          </Card>
          <Card>
            <div className="card-body">
              <h3>Клатч и серии</h3>
              <div className="muted">Серия побед: <b>{streaks.wins}</b></div>
              <div className="muted">Серия подиумов: <b>{streaks.podiums}</b></div>
            </div>
          </Card>
          <Card>
            <div className="card-body">
              <h3>Бенчмарки</h3>
              <div className="mt-1"><ProgressStat label="Средний итог (персентиль)" value={benchmarks.avg_points_pct} /></div>
              <div className="mt-1" />
              <div className="mt-1"><ProgressStat label="Сумма очков (персентиль)" value={benchmarks.total_points_pct} color="var(--violet-500)" /></div>
            </div>
          </Card>
        </div>

        {/* Head-to-Head виджет во всю ширину */}
        <Card style={{ marginTop: 16 }}>
          <div className="card-body">
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚔️ Head‑to‑Head
              <span className="muted" style={{ fontSize: '0.9em', fontWeight: 'normal' }}>
                ({(data.h2h || []).length} соперников)
              </span>
            </h3>
            
            {(data.h2h || []).length === 0 ? (
              <div className="muted" style={{ textAlign: 'center', padding: 20 }}>
                Нет данных о противостояниях
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: isMobile ? 12 : 16 
              }}>
                {(data.h2h || []).map((o: any) => {
                  const totalGames = o.games || 0;
                  const wins = o.wins || 0;
                  const losses = o.losses || 0;
                  const draws = o.draws || 0;
                  const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
                  const lossRate = totalGames > 0 ? (losses / totalGames) * 100 : 0;
                  const drawRate = totalGames > 0 ? (draws / totalGames) * 100 : 0;
                  
                  return (
                    <div 
                      key={o.opponent_id} 
                      style={{ 
                        background: 'var(--bg-secondary)', 
                        borderRadius: 'var(--radius-md)', 
                        padding: 16,
                        border: '1px solid var(--border-color)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Заголовок с командой */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: 12,
                        flexWrap: isMobile ? 'wrap' : 'nowrap',
                        gap: isMobile ? 8 : 0
                      }}>
                        <Link 
                          to={`/team/${o.opponent_id}`}
                          style={{ 
                            fontWeight: 600, 
                            color: 'var(--color-primary)',
                            textDecoration: 'none',
                            fontSize: isMobile ? '1em' : '1.1em',
                            wordBreak: 'break-word',
                            flex: 1,
                            minWidth: 0
                          }}
                        >
                          {o.opponent_name}
                        </Link>
                        <div style={{ 
                          background: 'var(--purple-100)', 
                          color: 'var(--purple-800)', 
                          padding: '4px 8px', 
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85em',
                          fontWeight: 600,
                          whiteSpace: 'nowrap'
                        }}>
                          {totalGames} игр
                        </div>
                      </div>

                      {/* Статистика W-L-D */}
                      <div style={{ 
                        display: 'flex', 
                        gap: isMobile ? 8 : 12, 
                        marginBottom: 12,
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            background: 'var(--green-500)' 
                          }} />
                          <span style={{ fontSize: '0.9em', fontWeight: 600 }}>W {wins}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            background: 'var(--red-500)' 
                          }} />
                          <span style={{ fontSize: '0.9em', fontWeight: 600 }}>L {losses}</span>
                        </div>
                        {draws > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: '50%', 
                              background: 'var(--yellow-500)' 
                            }} />
                            <span style={{ fontSize: '0.9em', fontWeight: 600 }}>D {draws}</span>
                          </div>
                        )}
                      </div>

                      {/* Визуальная полоса результатов */}
                      <div style={{ 
                        height: 8, 
                        borderRadius: 'var(--radius-sm)', 
                        background: 'var(--gray-200)',
                        overflow: 'hidden',
                        display: 'flex',
                        marginBottom: 8
                      }}>
                        {winRate > 0 && (
                          <div style={{ 
                            width: `${winRate}%`, 
                            background: 'linear-gradient(90deg, var(--green-400), var(--green-600))',
                            transition: 'width 0.3s ease'
                          }} />
                        )}
                        {drawRate > 0 && (
                          <div style={{ 
                            width: `${drawRate}%`, 
                            background: 'linear-gradient(90deg, var(--yellow-400), var(--yellow-600))',
                            transition: 'width 0.3s ease'
                          }} />
                        )}
                        {lossRate > 0 && (
                          <div style={{ 
                            width: `${lossRate}%`, 
                            background: 'linear-gradient(90deg, var(--red-400), var(--red-600))',
                            transition: 'width 0.3s ease'
                          }} />
                        )}
                      </div>

                      {/* Процентное соотношение */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.85em',
                        flexWrap: isMobile ? 'wrap' : 'nowrap',
                        gap: isMobile ? 4 : 0
                      }}>
                        <span style={{ color: 'var(--green-600)', fontWeight: 600 }}>
                          {winRate.toFixed(0)}% побед
                        </span>
                        {totalGames > 0 && (
                          <span className="muted" style={{ whiteSpace: 'nowrap' }}>
                            {wins > losses ? '😤 Отстаёт' : wins < losses ? '🔥 Доминирует' : '⚖️ Равные'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: 'var(--space-lg)', 
          marginTop: 16 
        }}>
          <Card>
            <div className="card-body">
              <h3>Удачные столы</h3>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                {(data.table_stats || []).map((t: any) => (
                  <li key={t.table_number} className="muted" style={{ marginBottom: 8 }}>Стол {t.table_number}: игр {t.games}, ср. место {t.avg_place}</li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        

        <Card style={{ marginTop: 16 }}>
          <div className="card-body">
            <h3>Последние игры</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
              gap: isMobile ? 'var(--space-md)' : 'var(--space-lg)', 
              marginTop: 12 
            }}>
              {(data.recent_games || []).map((g: any) => (
                <Card key={g.game_id}>
                  <div className="card-body">
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      flexWrap: isMobile ? 'wrap' : 'nowrap',
                      gap: isMobile ? 4 : 0,
                      marginBottom: 4
                    }}>
                      <Link 
                        to={`/board/${g.game_id}`}
                        style={{ 
                          wordBreak: 'break-word',
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        {g.game_name}
                      </Link>
                      <span className="muted" style={{ whiteSpace: 'nowrap' }}>место {g.place}</span>
                    </div>
                    <div className="muted">{g.total} баллов</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </Card>
  );
};

export default TeamProfile;



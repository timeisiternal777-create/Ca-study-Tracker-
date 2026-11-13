import { LuFlame, LuShield, LuSnowflake } from 'react-icons/lu';
import { Button, Modal } from '../ui';
import { FREEZE_EVERY, GOAL_WEEK_DAYS, MAX_FREEZES } from '../../lib/stats';
import { useStudy } from '../../context/StudyContext';

export function StreakInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { stats, settings } = useStudy();
  const rest = settings.restDays?.length ?? 0;
  return (
    <Modal open={open} onClose={onClose} title="How streaks work" footer={<Button variant="primary" onClick={onClose}>Got it</Button>}>
      <div className="col g-4">
        <div className="row g-4 items-start acc-ember">
          <span className="stat-icon" style={{ flex: 'none' }}><LuFlame /></span>
          <div>
            <div className="t-h3">Fire streak</div>
            <p className="t-small muted mt-1">Study at least <strong>{stats.streakMin} hours</strong> in a day (three quarters of your daily goal) to keep it burning. Each day in a row adds one. Today stays “pending” until you get there, so you never lose a streak before the day ends.</p>
          </div>
        </div>
        <div className="row g-4 items-start acc-cyan">
          <span className="stat-icon" style={{ flex: 'none' }}><LuSnowflake /></span>
          <div>
            <div className="t-h3">Streak freezes</div>
            <p className="t-small muted mt-1">Every {FREEZE_EVERY} days in a row you bank a freeze (up to {MAX_FREEZES}). If you miss a day, a freeze is used and your streak carries on. You have <strong>{stats.freezes}</strong> right now. Rest days you plan in Settings never break a streak either.</p>
          </div>
        </div>
        <div className="row g-4 items-start acc-gold">
          <span className="stat-icon" style={{ flex: 'none' }}><LuShield /></span>
          <div>
            <div className="t-h3">Goal weeks</div>
            <p className="t-small muted mt-1">A week (Monday to Sunday) is a goal week when you study <strong>{Math.round(stats.goalWeek.target)} hours</strong> in total: your daily goal for {Math.min(GOAL_WEEK_DAYS, 7 - rest)} days. Goal weeks in a row build the streak. The week in progress never breaks it.</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

import React, {useCallback, useLayoutEffect, useRef, useState} from 'react';
import styled from '@emotion/styled';
import {useResizeObserver} from '@react-aria/utils';

import Button from 'sentry/components/button';
import ButtonBar from 'sentry/components/buttonBar';
import {transformCrumbs} from 'sentry/components/events/interfaces/breadcrumbs/utils';
import CompactSelect from 'sentry/components/forms/compactSelect';
import {useReplayContext} from 'sentry/components/replays/replayContext';
import {formatTime, relativeTimeInMs} from 'sentry/components/replays/utils';
import {
  IconArrow,
  IconContract,
  IconExpand,
  IconNext,
  IconPause,
  IconPlay,
  IconPrevious,
  IconRewind10,
} from 'sentry/icons';
import {t} from 'sentry/locale';
import space from 'sentry/styles/space';
import {BreadcrumbType} from 'sentry/types/breadcrumbs';
import {getNextBreadcrumb} from 'sentry/utils/replays/getBreadcrumb';
import useFullscreen from 'sentry/utils/replays/hooks/useFullscreen';

const SECOND = 1000;

const USER_ACTIONS = [
  BreadcrumbType.ERROR,
  BreadcrumbType.INIT,
  BreadcrumbType.NAVIGATION,
  BreadcrumbType.UI,
  BreadcrumbType.USER,
];

interface Props {
  speedOptions?: number[];
  toggleFullscreen?: () => void;
}

function ReplayPlayPauseBar({isCompact}: {isCompact: boolean}) {
  const {
    currentTime,
    isFinished,
    isPlaying,
    replay,
    restart,
    setCurrentTime,
    togglePlayPause,
  } = useReplayContext();

  return (
    <ButtonBar merged>
      {!isCompact && (
        <Button
          size="xs"
          title={t('Rewind 10s')}
          icon={<IconRewind10 size="sm" />}
          onClick={() => setCurrentTime(currentTime - 10 * SECOND)}
          aria-label={t('Rewind 10 seconds')}
        />
      )}
      {isFinished ? (
        <Button
          size="xs"
          title={t('Restart Replay')}
          icon={<IconPrevious size="sm" />}
          onClick={restart}
          aria-label={t('Restart Replay')}
        />
      ) : (
        <Button
          size="xs"
          title={isPlaying ? t('Pause') : t('Play')}
          icon={isPlaying ? <IconPause size="sm" /> : <IconPlay size="sm" />}
          onClick={() => togglePlayPause(!isPlaying)}
          aria-label={isPlaying ? t('Pause') : t('Play')}
        />
      )}
      {!isCompact && (
        <Button
          size="xs"
          title={t('Next breadcrumb')}
          icon={<IconNext size="sm" />}
          onClick={() => {
            const startTimestampSec = replay?.getEvent().startTimestamp;
            if (!startTimestampSec) {
              return;
            }
            const transformedCrumbs = transformCrumbs(replay?.getRawCrumbs() || []);
            const next = getNextBreadcrumb({
              crumbs: transformedCrumbs.filter(crumb =>
                USER_ACTIONS.includes(crumb.type)
              ),
              targetTimestampMs: startTimestampSec * 1000 + currentTime,
            });

            if (startTimestampSec !== undefined && next?.timestamp) {
              setCurrentTime(relativeTimeInMs(next.timestamp, startTimestampSec));
            }
          }}
          aria-label={t('Fast-forward to next breadcrumb')}
        />
      )}
    </ButtonBar>
  );
}

function ReplayCurrentTime() {
  const {currentTime, duration} = useReplayContext();

  return (
    <span>
      {formatTime(currentTime)} / {duration ? formatTime(duration) : '??:??'}
    </span>
  );
}

function ReplayPlaybackSpeed({
  speedOptions,
  isCompact,
}: {
  isCompact: boolean;
  speedOptions: number[];
}) {
  const {setSpeed, speed} = useReplayContext();
  return (
    <CompactSelect
      triggerProps={{
        size: 'xs',
        prefix: isCompact ? '' : t('Speed'),
      }}
      value={speed}
      options={speedOptions.map(speedOption => ({
        value: speedOption,
        label: `${speedOption}x`,
        disabled: speedOption === speed,
      }))}
      onChange={opt => {
        setSpeed(opt.value);
      }}
    />
  );
}

const ReplayControls = ({
  toggleFullscreen = () => {},
  speedOptions = [0.1, 0.25, 0.5, 1, 2, 4],
}: Props) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [compactLevel, setCompactLevel] = useState(0);
  const {isFullscreen} = useFullscreen();
  const {isSkippingInactive, toggleSkipInactive} = useReplayContext();

  const updateCompactLevel = useCallback(() => {
    const {width} = barRef.current?.getBoundingClientRect() ?? {width: 500};
    if (width < 400) {
      setCompactLevel(1);
    } else {
      setCompactLevel(0);
    }
  }, []);

  useResizeObserver({
    ref: barRef,
    onResize: updateCompactLevel,
  });
  useLayoutEffect(() => updateCompactLevel, [updateCompactLevel]);

  return (
    <ButtonGrid ref={barRef}>
      <ReplayPlayPauseBar isCompact={compactLevel > 0} />
      <ReplayCurrentTime />

      {/* TODO(replay): Need a better icon for the FastForward toggle */}
      <Button
        size="xs"
        title={t('Fast-forward idle moments')}
        aria-label={t('Fast-forward idle moments')}
        icon={<IconArrow size="sm" direction="right" />}
        priority={isSkippingInactive ? 'primary' : undefined}
        onClick={() => toggleSkipInactive(!isSkippingInactive)}
      />

      <ReplayPlaybackSpeed speedOptions={speedOptions} isCompact={compactLevel > 0} />

      <Button
        size="xs"
        title={isFullscreen ? t('Exit full screen') : t('Enter full screen')}
        aria-label={isFullscreen ? t('Exit full screen') : t('Enter full screen')}
        icon={isFullscreen ? <IconContract size="sm" /> : <IconExpand size="sm" />}
        onClick={toggleFullscreen}
      />
    </ButtonGrid>
  );
};

const ButtonGrid = styled('div')`
  display: grid;
  grid-column-gap: ${space(1)};
  grid-template-columns: max-content auto max-content max-content max-content;
  align-items: center;
`;

export default ReplayControls;

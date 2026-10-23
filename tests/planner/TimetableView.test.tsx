import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {TimetableView} from '../../src/renderer/planner/TimetableView';
import {makeClass,makeMeeting} from '../fixtures/projects';

it('puts all seven weekdays in rows and 08:00–18:00 across the horizontal axis',()=>{
  const option=makeClass({meetings:[makeMeeting({startMinute:480,endMinute:540}),makeMeeting({day:5,startMinute:1020,endMinute:1080})]});
  const {container}=render(<TimetableView courses={[{code:'TEST1013',name:'School day',classes:[option]}]} timetable={{classIds:[option.id]}}/>);
  expect([...container.querySelectorAll('.day-label')].map(e=>e.textContent)).toEqual(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);
  expect(container.querySelector('.time-axis')).toHaveTextContent('08:00');
  expect(screen.getByText('08:00',{exact:true})).toBeInTheDocument();
  expect(screen.getByText('18:00',{exact:true})).toBeInTheDocument();
});

it('extends the range for actual evening classes but not unavailable time',()=>{
  const option=makeClass({meetings:[makeMeeting({day:6,startMinute:1080,endMinute:1200})]});
  const {container}=render(<TimetableView courses={[{code:'TEST1013',name:'Evening class',classes:[option]}]} timetable={{classIds:[option.id]}} blocked={[{day:7,startMinute:420,endMinute:480}]}/>);
  expect(container.querySelectorAll('.day-row')).toHaveLength(7);
  expect(screen.queryByText('07:00',{exact:true})).toBeNull();expect(screen.getByText('08:00',{exact:true})).toBeInTheDocument();
  expect(screen.getByText('20:00',{exact:true})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/18:00 to 20:00/})).toBeInTheDocument();
  expect(screen.queryByText('Unavailable')).toBeNull();
});
it('clips unavailable periods to 08:00–18:00 without expanding the axis or the grid',()=>{
  const {container}=render(<TimetableView courses={[]} blocked={[{day:1,startMinute:360,endMinute:540},{day:2,startMinute:1020,endMinute:1320},{day:3,startMinute:0,endMinute:420},{day:4,startMinute:1140,endMinute:1440}]}/>);
  expect([...container.querySelectorAll('.time-axis time')].map(t=>t.getAttribute('aria-label'))).toEqual(['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']);
  const blocks=container.querySelectorAll<HTMLElement>('.blocked-block');expect(blocks).toHaveLength(2);
  expect(blocks[0].style.left).toBe('0%');expect(blocks[0].style.width).toBe('10%');expect(blocks[1].style.left).toBe('90%');expect(blocks[1].style.width).toBe('10%');
});

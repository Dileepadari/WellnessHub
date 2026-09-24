import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sparkline } from './Sparkline';

/** Reads the `d` of the line path, which is the last path the component draws. */
const linePath = (container: HTMLElement) => {
  const paths = container.querySelectorAll('path');
  return paths[paths.length - 1].getAttribute('d') ?? '';
};

/** Pulls the y coordinates out of a path's "M x,y L x,y" form. */
const yValues = (d: string) =>
  d
    .replace(/^M/, '')
    .split(' L')
    .map((pair) => Number(pair.split(',')[1]));

describe('Sparkline', () => {
  it('says so when there is nothing to draw', () => {
    render(<Sparkline values={[]} />);
    expect(screen.getByText('no data')).toBeInTheDocument();
  });

  it('puts the highest value at the top and the lowest at the bottom', () => {
    const { container } = render(<Sparkline values={[1, 5, 9]} height={20} />);
    const [first, , last] = yValues(linePath(container));

    // Smaller y is higher up in SVG coordinates.
    expect(last).toBeLessThan(first);
  });

  it('draws a flat series at mid-height, not along the floor', () => {
    const { container } = render(<Sparkline values={[90, 90, 90]} height={20} />);

    // The fallback range of 1 placed every point at the minimum, which is the
    // bottom of the box, so an unchanged figure read as though it had bottomed out.
    expect(yValues(linePath(container))).toEqual([10, 10, 10]);
  });

  it('keeps the reference rule inside the drawing area', () => {
    const { container } = render(
      <Sparkline values={[10, 12, 11]} reference={40} height={20} />
    );
    const rule = container.querySelector('line');
    const y = Number(rule?.getAttribute('y1'));

    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(20);
  });

  it('spans the series min to max rather than starting at zero', () => {
    const { container } = render(<Sparkline values={[1000, 1001, 1002]} height={20} />);
    const ys = yValues(linePath(container));

    // Anchored at zero these three would be indistinguishable.
    expect(new Set(ys).size).toBe(3);
  });

  it('labels itself for assistive technology', () => {
    render(<Sparkline values={[1, 2]} label="Steps this week" />);
    expect(screen.getByRole('img', { name: 'Steps this week' })).toBeInTheDocument();
  });

  it('falls back to a generated label', () => {
    render(<Sparkline values={[1, 2, 3]} />);
    expect(screen.getByRole('img', { name: 'Trend across 3 days' })).toBeInTheDocument();
  });

  it('draws an area only when asked', () => {
    const { container: plain } = render(<Sparkline values={[1, 2, 3]} />);
    expect(plain.querySelectorAll('path')).toHaveLength(1);

    const { container: filled } = render(<Sparkline values={[1, 2, 3]} filled />);
    expect(filled.querySelectorAll('path')).toHaveLength(2);
  });

  it('can shrink below its nominal width', () => {
    const { container } = render(<Sparkline values={[1, 2]} width={1200} />);
    expect(container.querySelector('svg')).toHaveClass('max-w-full');
  });
});

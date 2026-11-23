import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../src/App';
import { clearDocumentState } from '../src/services/persistence';

describe('글침 컴포넌트 및 인터랙션 테스트', () => {
  beforeEach(() => {
    clearDocumentState();
  });

  it('첫 화면에서 예시 글을 불러오고 분석하기를 누르면 문장별 작업실로 전환된다', async () => {
    render(<App />);

    // 1. Check title
    expect(screen.getByRole('heading', { name: /글은 내가 쓰고/ })).toBeInTheDocument();

    // 2. Click "예시 글 불러오기"
    const sampleBtn = screen.getByRole('button', { name: /예시 글 불러오기/ });
    fireEvent.click(sampleBtn);

    // Textarea should contain text
    const textarea = screen.getByPlaceholderText('퇴고하고 싶은 글을 이곳에 붙여넣거나 직접 작성해 보세요.');
    expect((textarea as HTMLTextAreaElement).value).toContain('전시를 보러 갔다');

    // 3. Click "문장별 분석하기"
    const analyzeBtn = screen.getByRole('button', { name: /문장별 분석하기/ });
    fireEvent.click(analyzeBtn);

    // 4. Verify transition to workspace
    await waitFor(() => {
      expect(screen.getByText('문장별 퇴고 작업실')).toBeInTheDocument();
      expect(screen.getByText('완성 중인 원고')).toBeInTheDocument();
      expect(screen.getByText('문장 1')).toBeInTheDocument();
    });
  });

  it('문장 카드에서 직접 타이핑하면 완성 중인 원고에 즉시 동기화된다', async () => {
    render(<App />);

    // Load sample and analyze
    fireEvent.click(screen.getByRole('button', { name: /예시 글 불러오기/ }));
    fireEvent.click(screen.getByRole('button', { name: /문장별 분석하기/ }));

    await waitFor(() => {
      expect(screen.getByText('문장별 퇴고 작업실')).toBeInTheDocument();
    });

    // Find first sentence textarea
    const sentenceTextareas = screen.getAllByPlaceholderText('문장 내용을 수정해 보세요.');
    expect(sentenceTextareas.length).toBeGreaterThan(0);

    // Edit the first sentence
    fireEvent.change(sentenceTextareas[0], {
      target: { value: '전시회 관람을 위해 성수동에 방문했다.' },
    });

    // Live preview should update immediately
    const preview = screen.getByLabelText('완성 중인 원고 미리보기');
    expect(preview.textContent).toContain('전시회 관람을 위해 성수동에 방문했다.');
  });

  it('고정(lock) 모드로 전환 시 고정 보호 배너가 표시된다', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /예시 글 불러오기/ }));
    fireEvent.click(screen.getByRole('button', { name: /문장별 분석하기/ }));

    await waitFor(() => {
      expect(screen.getByText('문장별 퇴고 작업실')).toBeInTheDocument();
    });

    // Click lock button on first card
    const lockButtons = screen.getAllByText('🔒 고정');
    fireEvent.click(lockButtons[0]);

    // Check for lock protection message
    expect(screen.getByText('🔒 고정 보호 모드 활성화')).toBeInTheDocument();
  });

  it('수정 전후 비교 창을 열고 닫을 수 있다', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /예시 글 불러오기/ }));
    fireEvent.click(screen.getByRole('button', { name: /문장별 분석하기/ }));

    await waitFor(() => {
      expect(screen.getByText('문장별 퇴고 작업실')).toBeInTheDocument();
    });

    // Open Compare
    const compareBtn = screen.getByTitle('원본과 현재 수정본의 단어 단위 비교');
    fireEvent.click(compareBtn);

    expect(screen.getByText('처음 입력한 원문과 현재 완성된 원고의 차이를 확인합니다.')).toBeInTheDocument();

    // Close Compare
    const closeBtn = screen.getByText('작업실로 돌아가기');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('처음 입력한 원문과 현재 완성된 원고의 차이를 확인합니다.')).not.toBeInTheDocument();
    });
  });
});

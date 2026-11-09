package com.labmatch.module.base.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.labmatch.module.base.dto.CycleDetailView;
import com.labmatch.module.base.dto.StageView;
import com.labmatch.module.base.entity.Cycle;
import com.labmatch.module.base.entity.Round;
import com.labmatch.module.base.mapper.CycleMapper;
import com.labmatch.module.base.mapper.RoundMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CycleService {

    private final CycleMapper cycleMapper;
    private final RoundMapper roundMapper;
    private final StageService stageService;

    public CycleDetailView current() {
        Cycle cycle = cycleMapper.selectOne(new LambdaQueryWrapper<Cycle>()
                .eq(Cycle::getStatus, "RUNNING")
                .orderByDesc(Cycle::getId)
                .last("LIMIT 1"));
        if (cycle == null) {
            cycle = cycleMapper.selectOne(new LambdaQueryWrapper<Cycle>()
                    .orderByDesc(Cycle::getId)
                    .last("LIMIT 1"));
        }
        List<Round> rounds = cycle == null ? List.of() : rounds(cycle.getId());

        CycleDetailView view = new CycleDetailView();
        view.setCycle(cycle);
        view.setRounds(rounds);
        StageView stage = stageService.compute(cycle, rounds);
        view.setStage(stage);
        return view;
    }

    public List<Cycle> list() {
        return cycleMapper.selectList(new LambdaQueryWrapper<Cycle>().orderByDesc(Cycle::getId));
    }

    public List<Round> rounds(Long cycleId) {
        return roundMapper.selectList(new LambdaQueryWrapper<Round>()
                .eq(Round::getCycleId, cycleId)
                .orderByAsc(Round::getRoundNo));
    }
}

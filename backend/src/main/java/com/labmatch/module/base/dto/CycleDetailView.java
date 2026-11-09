package com.labmatch.module.base.dto;

import com.labmatch.module.base.entity.Cycle;
import com.labmatch.module.base.entity.Round;
import lombok.Data;

import java.util.List;

@Data
public class CycleDetailView {

    private Cycle cycle;
    private List<Round> rounds;
    private StageView stage;
}

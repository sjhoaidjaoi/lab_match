package com.labmatch.module.base.dto;

import com.labmatch.module.base.entity.Lab;
import lombok.Data;

import java.util.List;

@Data
public class LabDetailView {

    private Lab lab;
    private String leaderName;
    private Integer remaining;
    private List<MentorView> mentors;
}

<?php
class Playlist {

	public $list;
	public $audio_dir;

	public function Playlist($options = array()) {
		$defaults = array(
			'audio_dir' => __DIR__
		);
		foreach ($defaults as $key => $value) {
			$this->$key = (isset($options[$key])) ? $options[$key] : $value;
		}
		$this->buildPlaylist();
	}

	private function buildPlaylist() {
		$this->list = array();
		$all_handle = opendir($this->audio_dir);
		while ($mood = readdir($all_handle)) {
			if ($mood == '.' || $mood == '..') continue;
			$mood_handle = opendir($this->audio_dir . '/' . $mood);
			$this->list[$mood] = array();
			while ($hour = readdir($mood_handle)) {
				if ($hour == '.' || $hour == '..') continue;
				$hour_handle = opendir($this->audio_dir . '/' . $mood . '/' . $hour);
				$this->list[$mood][$hour] = array();
				while ($file = readdir($hour_handle)) {
					if ($file == '.' || $file == '..') continue;
					$this->list[$mood][$hour][] = $file;
				}
				closedir($hour_handle);
				sort($this->list[$mood][$hour]);
			}
			closedir($mood_handle);
			ksort($this->list[$mood]);
		}
		closedir($all_handle);
	}

}
